require 'spec_helper'
require 'tsort'

describe 'TSort' do
  before :each do
    @graph = Graph.new({1 => [2, 3], 2 => [3], 3 => [], 4 => []})
    @cyclic = Graph.new({1 => [2], 2 => [3, 4], 3 => [2], 4 => []})
  end

  it "sorts a graph of children" do
    @graph.tsort.should == [3, 2, 1, 4]
  end

  it "groups a graph into its strongly connected components" do
    @cyclic.strongly_connected_components.should == [[4], [2, 3], [1]]
  end

  it "raises TSort::Cyclic for a graph that has no topological order" do
    -> { @cyclic.tsort }.should raise_error(TSort::Cyclic)
  end

  it "walks the components reachable from a node" do
    seen = []
    TSort.each_strongly_connected_component_from(1, children_of({1 => [2], 2 => [3, 4], 3 => [2], 4 => []})) do |component|
      seen << component
    end
    seen.should == [[4], [2, 3], [1]]
  end

  it "sorts with the module functions over an each_node and an each_child" do
    each_node = -> (&block) { [1, 2, 3].each(&block) }
    each_child = -> (node, &block) { (node == 1 ? [2] : node == 2 ? [3] : []).each(&block) }
    TSort.tsort(each_node, each_child).should == [3, 2, 1]
  end

  def children_of(hash)
    -> (node, &block) { hash.fetch(node).each(&block) }
  end

  class Graph
    include TSort

    def initialize(hash)
      @hash = hash
    end

    def tsort_each_node(&block)
      @hash.each_key(&block)
    end

    def tsort_each_child(node, &block)
      @hash.fetch(node).each(&block)
    end
  end
end
