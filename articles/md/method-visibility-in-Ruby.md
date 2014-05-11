# Method visibility in Ruby
## May 11th 2014

I have started playing around Ruby and came across protected and private visibility keywords which works differently then other languages.
If you mark method to be private you can invoke it only using implicit invocation inside of this class methods:

```ruby
class Person
  def test
    hello #this works / implicit invocation
    self.hello #this doesn't work / explicit invocation
  end

  private
  def hello
    puts "hello there"
  end
end

person = Person.new
person.test
```

you can also invoke parent private methods implicitly in child class:

```ruby
class Parent
  private
  def hello
    puts "hello i am parent "
  end
end

class Child < Parent
  def test
    hello #this works / implicit invocation
    self.hello #this doesn't work / explicit invocation
  end
end


child = Child.new
child.test
```

protected keyword works same way but you can call it using implicit invocation and explicit invocation too.

you can't call private or protected methods outside of class:
```ruby
class Person
  protected
  def hello_protected
    puts "hello i am protected"
  end

  private
  def hello_private
    puts "hello i am private"
  end
end

child = Person.new
#both raises error
child.hello_protected
child.hello_private
```
