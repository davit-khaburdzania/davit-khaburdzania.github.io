# Setting Up Scheme
## January 23th 2014

I have decided to start studing one of the old and famous courses of MIT [SICP](http://bit.ly/1hBkxTi) which uses scheme as programming language and it took me some time to setup things and it would help someone or me in the future.

I used MIT-SCHEME as implementation of scheme: First we need to download [binarys](http://www.gnu.org/software/mit-scheme/), 
after that we need to move package to Applications folder and create links so i can just type scheme in terminal


```bash
sudo ln -s /Applications/MIT\:GNU\ Scheme.app/Contents/Resources /usr/local/lib/mit-scheme-x86-64
sudo ln -s /usr/local/lib/mit-scheme-x86-64/mit-scheme /usr/bin/scheme
```
after that i wanted to execute scheme inside my sublime text so created new built system
```javascript
{
  "cmd": ["scheme", "--silent", "--load", "$file"],
  "file_regex": "^[ ]*File \"(...*?)\", line ([0-9]*)",
  "selector": "source.sch",
  "path": "/usr/bin"
}
```
uhuu and everything is ready.
