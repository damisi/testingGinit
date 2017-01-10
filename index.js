'use strict'

var chalk       = require('chalk');
var clear       = require('clear');
var CLI         = require('clui');
var figlet      = require('figlet');
var inquirer    = require('inquirer');
var Preferences = require('preferences');
var Spinner     = CLI.Spinner;
var GitHubApi   = require('github');
var _           = require('lodash');
var git         = require('simple-git')();
var touch       = require('touch');
var fs          = require('fs');
var files 		= require('./lib/files');

// clear();
console.log(
  chalk.yellow(
    figlet.textSync('My GitAuth', { horizontalLayout: 'fitted' })
  )
);

if (files.directoryExists('.git')) {
  console.log(chalk.red('Already a git repository!'));
  process.exit();
}

var github = new GitHubApi({
  version: '3.0.0'
});

function getGithubCredentials(callback) {
  var questions = [
    {
      name: 'username',
      type: 'input',
      message: 'Enter your Github username or e-mail address:',
      validate: function( value ) {
        if (value.length) {
          return true;
        } else {
          return 'Please enter your username or e-mail address';
        }
      }
    },
    {
      name: 'password',
      type: 'password',
      message: 'Enter your password:',
      validate: function(value) {
        if (value.length) {
          return true;
        } else {
          return 'Please enter your password';
        }
      }
    }
  ];

  inquirer.prompt(questions).then(callback);
}

function getGithubToken(callback) {
	var prefs = new Preferences('ginit');

	if (prefs.github && prefs.github.token) {
	    return callback(null, prefs.github.token);
	}

	getGithubCredentials(function(credentials) {
	  var status = new Spinner('Authenticating you, please wait...');
	  status.start();

	  github.authenticate(
	    _.extend(
	      {
	        type: 'basic',
	      },
	      credentials
	    )
	  );

	  github.authorization.create({
	    scopes: ['user', 'public_repo', 'repo', 'repo:status'],
	    note: 'ginit, the command-line tool for initalizing Git repos'
	  }, function(err, res) {
	    status.stop();
	    if ( err ) {
	      return callback( err );
	    }
	    if (res.token) {
	      prefs.github = {
	        token : res.token
	      };
	      return callback(null, res.token);
	    }
	    return callback();
	  });
	});
}

function githubAuth(callback) {
  getGithubToken(function(err, token) {
    if (err) {
      return callback(err);
    }
    github.authenticate({
      type : 'oauth',
      token : token
    });
    return callback(null, token);
  });
}

githubAuth(function(err, authed) {
  if (err) {
    switch (err.code) {
      case 401:
        console.log(chalk.red('Couldn\'t log you in. Please try again.'));
        break;
      case 422:
        console.log(chalk.red('You already have an access token.'));
        break;
    }
  }
  if (authed) {
    console.log(chalk.green('Sucessfully authenticated!'));
   }
});