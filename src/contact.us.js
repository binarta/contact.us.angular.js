var $routeProviderReference;
angular.module('contact.us', ['ngRoute'])
    .factory('submitContactUsMessage', ['$http', function($http) {
        return SubmitContactUsMessageFactory($http);
    }])
    .controller('ContactUsController', ['$scope', '$routeParams', 'submitContactUsMessage', 'topicMessageDispatcher', 'config', ContactUsController])
    .config(['$routeProvider', function ($routeProvider) {
        $routeProviderReference = $routeProvider;
    }])
    .run(function(topicRegistry){
        topicRegistry.subscribe('config.initialized', function (config) {
            var version = '';
            if(config.version) version = '?v=' + config.version;
            $routeProviderReference
                .when('/contact', {templateUrl: 'partials/contact.html'+version, title: 'Contact Us'})
                .when('/contact/:subject', {templateUrl: 'partials/contact.html'+version, title: 'Contact Us'})
                .when('/:locale/contact', {templateUrl: 'partials/contact.html'+version, title: 'Contact Us'})
                .when('/:locale/contact/:subject', {templateUrl: 'partials/contact.html'+version, title: 'Contact Us'});
        });
    });

function SubmitContactUsMessageFactory($http) {
    return function(uri, data) {
        var promise = $http.post(uri, data);
        var wrapper = {
            success: function (cb) {
                promise.success(cb);
                return wrapper;
            },
            error: function (cb) {
                promise.error(cb);
                return wrapper;
            }
        };
        return wrapper;
    }
}

function ContactUsController($scope, $routeParams, submitContactUsMessage, topicMessageDispatcher, config) {
    var self = this;
    this.errors = {};

    var reset = function() {
        $scope.replyTo = '';
        $scope.subject = '';
        $scope.message = '';
        $scope.name = '';
    };

    var onSuccess = function() {
        $scope.sent = true;
        $scope.sending = false;
        reset();
        topicMessageDispatcher.fire('system.success', {
            code:'contact.us.sent',
            default:'Your message was delivered successfully, thank you.'
        });
        topicMessageDispatcher.fire('contact.us.submit.success','');
    };

    var onError = function(body, status) {
        $scope.sending = false;
        if(status == 412) self.errors = body;
        else topicMessageDispatcher.fire('system.alert', status);
    };

    $scope.submit = function() {
        self.errors = {};
        $scope.sending = true;

        $subject = $scope.subject;
        if($scope.name != ''){
            $subject = $scope.name + ': ' + $scope.subject
        }

        var data = {
            replyTo: $scope.replyTo,
            subject: $subject,
            message: $scope.message
        };
        if(config.namespace) data.namespace = config.namespace;
        submitContactUsMessage((config.baseUri || '') + 'api/contact/us', data).success(onSuccess).error(onError);
    };

    $scope.confirm = function() {
        $scope.sent = false;
    };

    $scope.errorClassFor = function(key) {
        return self.errors[key] ? 'error' : '';
    };

    $scope.violations = function(key) {
        return self.errors[key];
    };

    this.getScope = function() {
        return $scope;
    };

    function extractSubjectFromRouteOrEmpty() {
        return $routeParams.subject || '';
    }

    reset();
    $scope.subject = extractSubjectFromRouteOrEmpty();
}
