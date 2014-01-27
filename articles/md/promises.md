# Promises
## November 14th 2013


Promises are way to interact with result of asynchronous operation, for example you are doing http request you can return a promise and interact with it instead of registering callback function. Result is nice code structure no callback hells and better error handling.
Best way to learn new things is to implement it by yourself so i made very simple implementation:

```javascript
function Promise () {
  var fail,then, instance, thenCb, failCb, self = this;

  self.resolve =  function (data) {
    if (thenCb) {
      thenCb(data);
    }
  };
  self.reject =  function (error) {
    if (failCb) {
      failCb(error);
    }
  };

  instance = {
    fail: function (cb) {
      failCb = cb;
      return self.get();
    },
    then: function (cb) {
      thenCb = cb;
      return self.get();
    }
  };

  self.get = function () {
    return instance;
  }
};
```

```javascript
//example usage
var fs = require('fs');

function read (name) {
  var promise = new Promise();

  fs.readFile(name , function (error, data) {
    if (error) {
      promise.reject(error);
    }
    if (data) {
      promise.resolve(data);
    }
  });

  return promise.get();
};

read('viri.txt')
  .then(function (data) {
    console.log('wow i got data');
  })
  .fail(function () {
    console.log('shit failed')
  });
```
