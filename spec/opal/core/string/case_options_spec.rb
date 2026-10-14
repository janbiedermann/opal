require 'spec_helper'

describe 'String case options' do
  describe ':ascii' do
    it 'leaves the non-ASCII characters alone' do
      'CÅR'.downcase(:ascii).should == 'cÅr'
      'CÅR'.upcase(:ascii).should == 'CÅR'
      'CÅR'.swapcase(:ascii).should == 'cÅr'
      'CÅR'.capitalize(:ascii).should == 'CÅr'
    end
  end

  describe ':fold' do
    it 'is only allowed for downcase' do
      -> { 'ABC'.upcase(:fold) }.should raise_error(ArgumentError, 'option :fold only allowed for downcasing')
      -> { 'ABC'.capitalize(:fold) }.should raise_error(ArgumentError, 'option :fold only allowed for downcasing')
      -> { 'ABC'.swapcase(:fold) }.should raise_error(ArgumentError, 'option :fold only allowed for downcasing')
    end
  end

  describe 'two options' do
    it 'raises too many options' do
      -> { 'ABC'.downcase(:ascii, :fold) }.should raise_error(ArgumentError, 'too many options')
      -> { 'ABC'.downcase(:fold, :ascii) }.should raise_error(ArgumentError, 'too many options')
      -> { 'ABC'.downcase(:ascii, :ascii) }.should raise_error(ArgumentError, 'too many options')
      -> { 'ABC'.downcase(:fold, :fold) }.should raise_error(ArgumentError, 'too many options')
      -> { 'ABC'.upcase(:ascii, :fold) }.should raise_error(ArgumentError, 'too many options')
      -> { 'ABC'.capitalize(:fold, :ascii) }.should raise_error(ArgumentError, 'too many options')
      -> { 'ABC'.swapcase(:ascii, :ascii) }.should raise_error(ArgumentError, 'too many options')
    end
  end

  describe ':turkic and :lithuanian' do
    it 'maps I and i with the tr and lt locales' do
      'İ'.downcase(:turkic).should == 'i'
      'I'.downcase(:turkic).should == 'ı'
      'i'.upcase(:turkic).should == 'İ'
      'İS'.downcase(:lithuanian).should == 'i̇s'
      'i'.upcase(:lithuanian).should == 'I'
      'ış'.swapcase(:turkic).should == 'IŞ'
    end

    it 'accepts :turkic together with :lithuanian' do
      'İ'.downcase(:turkic, :lithuanian).should == 'i'
      'İ'.downcase(:lithuanian, :turkic).should == 'i'
    end

    it 'rejects the other pairs' do
      -> { 'ABC'.downcase(:turkic, :ascii) }.should raise_error(ArgumentError, 'invalid second option')
      -> { 'ABC'.downcase(:turkic, :turkic) }.should raise_error(ArgumentError, 'invalid second option')
      -> { 'ABC'.downcase(:lithuanian, :fold) }.should raise_error(ArgumentError, 'invalid second option')
      -> { 'ABC'.downcase(:ascii, :turkic) }.should raise_error(ArgumentError, 'too many options')
      -> { 'ABC'.downcase(:fold, :lithuanian) }.should raise_error(ArgumentError, 'too many options')
      -> { 'ABC'.downcase(:turkic, :lithuanian, :ascii) }.should raise_error(ArgumentError, 'too many options')
    end
  end

  describe 'an unknown option' do
    it 'raises invalid option' do
      -> { 'ABC'.downcase(:invalid_option) }.should raise_error(ArgumentError, 'invalid option')
      -> { 'ABC'.upcase(:ASCII) }.should raise_error(ArgumentError, 'invalid option')
      -> { 'ABC'.downcase(:CASE_FOLD) }.should raise_error(ArgumentError, 'invalid option')
    end
  end
end
