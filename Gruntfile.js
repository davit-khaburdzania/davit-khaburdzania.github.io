module.exports = function (grunt) {
  grunt.initConfig({
    nodestatic: {
      server: {
        options: {
          port: 3000,
          keepalive: true
        }
      }
    },
    
    less: {
      options: {
        path: 'assets'
      },
      src: {
        expand: true,
        cwd:    'assets/less/',
        src:    ['*.less'],
        dest:   'assets/css/', 
        ext:    '.css'
      }
    },

    watch: {
      less: {
        files: 'assets/less/*.less',
        tasks: 'less'
      },
      articles: {
        files: [
          'articles/md/*.md',
          'templates/*.html'
        ],
        tasks: 'build'
      }
    }
  });

  grunt.loadNpmTasks('grunt-nodestatic');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('preview', 'nodestatic:server');

  grunt.registerTask('build', 'build blog', function () {
    require(__dirname + '/src/app.js');
  });
};
