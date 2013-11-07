# micro-pipe

Support for making functions pipeline. Only 549 byte raw file.
You can use this both node and browsers.

## Install

Install with [npm](http://github.com/isaacs/npm):

    npm install micro-pipe
    
## API - Set functions by args

    var micropipe = require('micro-pipe');
    micropipe(function(next){ console('a'), next()}
              ,function(next){ console('b'), next()}
              ,function(){ console('c')}); // => 'a', 'b', 'c'

### - return value to next

    var micropipe = require('micro-pipe');
    micropipe(function(next){ console('a'), next('b')}
              ,function(v, next){ console(v == 'b'), next('c')}
              ,function(v){ console(v == 'c')}); // => 'a', true, true

### - set functions by array

    var micropipe = require('micro-pipe');
    var fns = [];
    fns.push(function(next){ console('a'), next()});
    fns.push(function(next){ console('b'), next()});
    fns.push(function(){ console('c')})
    micropipe(fns); // => 'a', 'b', 'c'

### also use on browser

```html
<script type="text/javascript" src="micro-pipe.js"></script>
<script type="text/javascript">

    micropipe(function(next){ console('x'), next()}
              ,function(next){ console('y'), next()}
              ,function(){ console('z')}); // => 'x', 'y', 'z'

</script>
```
