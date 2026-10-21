# backtick_javascript: true

describe "Case statement" do
  it "works with JS object-wrapped values" do
    a = false
    objwr = `new String("abc")`

    case objwr
    when "abc"
      a = true
    end

    a.should == true
  end

  # A `case` whose value is discarded becomes a JS switch whose subject is
  # followed by `.valueOf()`. Emitting that subject bare was a syntax error for
  # an Integer literal (`switch (1.valueOf())`) and it silently changed an
  # operator expression (`switch (a || nil.valueOf())`).
  it "compiles a discarded case whose subject is an Integer literal" do
    chosen = nil

    case 1
    when 2 then chosen = :two
    when 1 then chosen = :one
    else chosen = :other
    end

    chosen.should == :one
  end

  it "compares a subject written in any of the integer notations" do
    out = []

    case -1
    when 1 then out << :one
    when -1 then out << :minus_one
    end

    case 0x10
    when 16 then out << :hex
    end

    case 0o17
    when 15 then out << :octal
    end

    case 1_000
    when 1000 then out << :underscored
    end

    case 2
    when 1, 2 then out << :several_values
    end

    out.should == [:minus_one, :hex, :octal, :underscored, :several_values]
  end

  it "compares float, Symbol and String subjects and takes the else branch" do
    out = []

    case 1.5
    when 1.5 then out << :float
    end

    case :sym
    when :sym then out << :symbol
    end

    case "str"
    when "str" then out << :string
    end

    case 5
    when 1 then out << :one
    else out << :else_branch
    end

    out.should == [:float, :symbol, :string, :else_branch]
  end

  # The shape at opal/corelib/kernel/format.rb: the subject is a JS expression,
  # which CRuby writes as `str[i] || nil`, and it has to keep its meaning when
  # the `.valueOf()` is appended.
  it "applies valueOf to a whole operator expression subject" do
    out = []
    str = "a#"
    i = 0

    case `str[i] || nil`
    when "#" then out << :hash
    when "a" then out << :letter_a
    else out << :no_match
    end

    i = 1

    case `str[i] || nil`
    when "#" then out << :hash
    when "a" then out << :letter_a
    else out << :no_match
    end

    out.should == [:letter_a, :hash]
  end
end
