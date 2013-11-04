basePath = '../';

files = [
    JASMINE,
    JASMINE_ADAPTER,
    'bower_components/angular/angular.js',
    'bower_components/angular-mocks/angular-mocks.js',
    'bower_components/thk-notifications-mock/src/notifications.mock.js',
    'bower_components/thk-rest-client-mock/src/rest.client.mock.js',
    'src/**/*.js',
    'test/**/*.js'
];

autoWatch = true;

browsers = ['PhantomJS'];

junitReporter = {
    outputFile: 'test_out/unit.xml',
    suite: 'unit'
};
