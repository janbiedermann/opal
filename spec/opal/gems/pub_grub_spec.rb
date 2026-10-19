require 'spec_helper'
require 'rubygems'
require 'rubygems/vendored_pub_grub'

# The PubGrub solver RubyGems vendors, ported 1:1 into
# lib/rubygems/vendor/pub_grub: it is what makes resolution on Opal the same
# resolution RubyGems does (GEMS.md, §1). Nothing here needs the filesystem or
# the network, and the port needed nothing from corelib that it did not already
# have - Hash#compare_by_identity, Range#bsearch, Struct.new with a block and
# keyword arguments are all there, so the vendored files stand as they are.

def pubgrub_solve(&block)
  source = Gem::PubGrub::StaticPackageSource.new(&block)
  Gem::PubGrub::VersionSolver.new(source: source).solve
end

describe 'Gem::PubGrub' do
  it 'solves the requirements the root asks for' do
    solution = pubgrub_solve do |s|
      s.add 'a', '1.0.0', deps: { 'b' => '~> 2.0' }
      s.add 'b', '2.0.0'
      s.add 'b', '1.0.0'
      s.add 'c', '1.0.0', deps: { 'b' => '>= 2.0' }
      s.root deps: { 'a' => '>= 0', 'c' => '>= 0' }
    end

    solution['a'].to_s.should == '1.0.0'
    solution['b'].to_s.should == '2.0.0'
    solution['c'].to_s.should == '1.0.0'
  end

  it 'backs up to an older version when the one it chose conflicts' do
    solution = pubgrub_solve do |s|
      s.add 'a', '1.0.0', deps: { 'b' => '< 2.0' }
      s.add 'b', '3.0.0'
      s.add 'b', '2.0.0'
      s.add 'b', '1.0.0'
      s.root deps: { 'a' => '>= 0', 'b' => '>= 0' }
    end

    # b is tried at its newest first, and a is what sends it down to 1.0.0
    solution['b'].to_s.should == '1.0.0'
  end

  it 'fails with a message that says which requirement could not be met' do
    error = nil
    begin
      pubgrub_solve do |s|
        s.add 'a', '1.0.0', deps: { 'b' => '> 5' }
        s.add 'b', '1.0.0'
        s.root deps: { 'a' => '>= 0' }
      end
    rescue Gem::PubGrub::SolveFailure => e
      error = e
    end

    error.should_not == nil
    error.message.should.include? 'Could not find compatible versions'
    error.message.should.include? 'no versions satisfy b > 5'
    error.message.should.include? 'version solving has failed'
  end

  # The bridge the resolver hands its requirements through: Gem::Requirement's
  # operators become PubGrub ranges, whose own syntax is the one that shows up
  # in the failure messages above.
  it 'reads a Gem::Requirement as a version range' do
    range = Gem::PubGrub::RubyGems.requirement_to_range(Gem::Requirement.new('~> 2.0'))

    range.include?(Gem::Version.new('2.0.0')).should == true
    range.include?(Gem::Version.new('2.9.9')).should == true
    range.include?(Gem::Version.new('3.0.0')).should == false
    range.include?(Gem::Version.new('1.9.9')).should == false

    Gem::PubGrub::RubyGems.requirement_to_range(Gem::Requirement.new('!= 2.0.0'))
      .include?(Gem::Version.new('2.0.0')).should == false
  end

  it 'meets a dependency that names a version, an operator and nothing else' do
    source = Gem::PubGrub::StaticPackageSource.new do |s|
      s.add 'a', '1.0.0'
      s.add 'a', '0.1.0'
      s.root deps: { 'a' => '>= 0.5' }
    end

    constraint = source.parse_dependency('a', '>= 0.5')
    constraint.to_s.should == 'a >= 0.5'
    constraint.range.include?(Gem::Version.new('1.0.0')).should == true
    constraint.range.include?(Gem::Version.new('0.1.0')).should == false

    # a package the source does not know is not a constraint at all
    source.parse_dependency('nope', '>= 0').should == false
  end
end
