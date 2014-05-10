# New Harmony Features In Node.js
## April 17th 2014

## Overview


Lately i tried to play around harmony flag with Node.js and i am going to document everything i have learn here.

So as you know Node.js is built on top of V8 Javascript Engene, and it's been long that they have started implementing ES6 new features. As you may have guessed you can use ES6 in Node.js too, using `--harmony` flag.   


##Setting things   


I will be using Node.js version `0.11.12`. This version is not stable so you need way to manage multiple versions of Node, for that [NVM](https://github.com/creationix/nvm) comes to rescue us.

Installing And setting up NVM is preatty easy: 
```bash 
curl https://raw.github.com/creationix/nvm/v0.4.0/install.sh | sh
nvm install 0.11 #install latest version of node
nvm use 0.11 #use v0.11 node version  
nvm alias default 0.11 #make it default
```

To use some of the ES6 features you need to be in strict mode, Node.js has `use-strict` flag for that. I suggest to use it every time you run Node.js script. To make things convinient i added node alias in my `.zshrc` file

```bash
alias node='node --harmony --use-strict'
```
So every time i will run `node app.js` it will use harmony and strict flags to run my script, Perfect!


## New Features

To get list of new ES6 features you can use in v0.11, you can run:
```
node --v8-options | grep harmony

#which gives this list:
/*
  --harmony_typeof (enable harmony semantics for typeof)
  --harmony_scoping (enable harmony block scoping)
  --harmony_modules (enable harmony modules (implies block scoping))
  --harmony_symbols (enable harmony symbols (a.k.a. private names))
  --harmony_proxies (enable harmony proxies)
  --harmony_collections (enable harmony collections (sets, maps, and weak maps))
  --harmony_observation (enable harmony object observation (implies harmony collections)
  --harmony_generators (enable harmony generators)
  --harmony_iteration (enable harmony iteration (for-of))
  --harmony_numeric_literals (enable harmony numeric literals (0o77, 0b11))
  --harmony_strings (enable harmony string)
  --harmony_arrays (enable harmony arrays)
  --harmony_maths (enable harmony math functions)
  --harmony (enable all harmony features (except typeof))
*/
```
there are lot's of things to check out, hm really neat!!!


## Harmony Scoping
harmony scoping gives us way to define variables in block scope using let keyword,
so lets see example:
```js
if (true){
  let x = 'donkey';
  console.log(x); //donkey
}
console.log(x) //undefined
```
you can see that x is only defined in the block if executed and not visible outside of it. 

## Harmony Generators
Generators let us to stop and resume execution of function. It's really one of the biggest features in ES6 because using generators and some tricks we can write asyncronius functions without ugly callbecks.
```js
//defining generator is same as function declaration but adding asterix *
function* Fib() {
  var fb1=0, fb2=1, current;
  
  while(true) {
    current = fb1 + fb2;
    yield current;
    
    fb1 = fb2;
    fb2 = current;
  }
};

//this returns just Generator itarable object
var numbers = Fib();
//now we can call next function to get next value and pause function
console.log(numbers.next()); //{ value: 1, done: false }
console.log(numbers.next());//{ value: 2, done: false }
console.log(numbers.next());//{ value: 3, done: false }
```
there are lot's of cool things build on top of generators feature, you can check [Koa.js](http://koajs.com/) for example.

