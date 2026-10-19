require 'spec_helper'
require 'rubygems'

# The failure classes of rubygems/errors.rb. The activation ones hang off
# ::LoadError, not off Gem::Exception: a script that rescues LoadError sees a
# gem it cannot activate, and one that rescues StandardError does not - the
# same difference CRuby makes, and the reason these classes are not in
# rubygems/exceptions.rb.
describe 'Gem::LoadError' do
  it 'is a LoadError and not a StandardError' do
    Gem::LoadError.ancestors.should.include? ::LoadError
    ::StandardError.ancestors.include?(Gem::LoadError).should == false
  end

  it 'carries the name and the requirement of the gem that failed to activate' do
    error = Gem::LoadError.new 'cannot activate'

    error.name        = 'tiny'
    error.requirement = Gem::Requirement.new('>= 1.0')

    error.message.should    == 'cannot activate'
    error.name.should       == 'tiny'
    error.requirement.to_s.should == '>= 1.0'
  end

  it 'makes the conflict and lookup errors LoadErrors too' do
    Gem::ConflictError.ancestors.should.include?      Gem::LoadError
    Gem::MissingSpecError.ancestors.should.include?   Gem::LoadError
    Gem::MissingSpecVersionError.ancestors.should.include? Gem::MissingSpecError
  end

  it 'names the target and the conflicting specifications of a ConflictError' do
    target = Gem::Specification.new 'app', '0.1.0'
    other  = Gem::Specification.new 'dep', '1.0.0'
    dep    = Gem::Dependency.new 'dep', '>= 2.0'

    error = Gem::ConflictError.new target, { other => [dep] }

    error.target.full_name.should    == 'app-0.1.0'
    error.name.should                == 'app'
    error.conflicts[other].should    == [dep]
    error.message.should.include? 'Unable to activate app-0.1.0'
    error.message.should.include? 'dep-1.0.0 conflicts with dep (>= 2.0)'
  end

  it 'lists the platforms a gem was built for in a PlatformMismatch' do
    reason = Gem::PlatformMismatch.new 'tiny', '0.1.0'

    reason.wordy.should.include? 'Found tiny (0.1.0), but was for platforms '

    reason.add_platform Gem::Platform.new 'java'
    reason.wordy.should.include? 'but was for platform java'

    reason.add_platform Gem::Platform.new 'x86-mingw32'
    reason.wordy.should.include? 'platforms java ,x86-mingw32'
  end

  it 'describes a fetch problem with the source it came from' do
    source = Gem::Source.new 'https://example.com/'
    reason = Gem::SourceFetchProblem.new source, RuntimeError.new('timeout')

    reason.wordy.should.include? 'https://example.com/'
    reason.wordy.should.include? 'timeout'
    reason.error.message.should == 'timeout'
    reason.exception.should == reason.error
  end
end
