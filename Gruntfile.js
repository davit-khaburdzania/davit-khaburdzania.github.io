module.exports = function (grunt) {
  grunt.initConfig({
    nodestatic: {
      server: {
        options: {
          port: 3000,
          keepalive: true
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-nodestatic');
  grunt.registerTask('preview', 'nodestatic:server');
};
