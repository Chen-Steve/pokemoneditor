#!/usr/bin/env ruby
require 'pp'

# Auto‑define any missing classes/modules so Marshal.load won’t choke
def define_missing(name)
  name.split('::').inject(Object) do |parent, const|
    if parent.const_defined?(const, false)
      parent.const_get(const)
    else
      parent.const_set(const, Class.new)
    end
  end
end

def safe_load(path)
  data = nil
  begin
    data = Marshal.load(File.binread(path))
  rescue NameError, ArgumentError => e
    if e.message =~ /undefined class\/module (.+)$/
      define_missing($1)
      retry
    end
    abort "Load error: #{e.message}"
  end
  data
end

def traverse(obj, indent = "")
  case obj
  when Array
    obj.each_with_index { |v,i| puts "#{indent}[#{i}] (#{v.class})"; traverse(v, indent+"  ") }
  when Hash
    obj.each { |k,v| puts "#{indent}#{k.inspect} => (#{v.class})"; traverse(v, indent+"  ") }
  else
    if obj.respond_to?(:instance_variables) && obj.instance_variables.any?
      puts "#{indent}#{obj.class}"
      obj.instance_variables.each do |ivar|
        val = obj.instance_variable_get(ivar)
        puts "#{indent}  #{ivar} => #{val.class}#{": #{val.inspect}" if [String,Numeric].include?(val.class)}"
        traverse(val, indent+"    ")
      end
    else
      puts "#{indent}#{obj.inspect}" unless obj.nil?
    end
  end
end

if __FILE__ == $0
  path = ARGV.first || "Game.rxdata"
  data = safe_load(path)

  if data.is_a?(Array)
    puts "Top‑level Array (#{data.size})"
    traverse(data)
  else
    puts "Top‑level #{data.class}"
    traverse(data)
  end
end