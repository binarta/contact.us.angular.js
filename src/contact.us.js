(function () {
    angular.module('contact.us', ['ngRoute', 'notifications', 'config', 'checkpoint'])
        .factory('submitContactUsMessage', ['$http', function($http) {
            return SubmitContactUsMessageFactory($http);
        }])
        .controller('ContactUsController', ['$scope', '$routeParams', 'submitContactUsMessage', 'topicMessageDispatcher', 'config', 'localeResolver', 'fetchAccountMetadata', ContactUsController])
        .config(['$routeProvider', function ($routeProvider) {
            $routeProvider
                .when('/contact', {templateUrl: 'partials/contact.html', title: 'Contact Us'})
                .when('/contact/:subject', {templateUrl: 'partials/contact.html', title: 'Contact Us'})
                .when('/:locale/contact', {templateUrl: 'partials/contact.html', title: 'Contact Us'})
                .when('/:locale/contact/:subject', {templateUrl: 'partials/contact.html', title: 'Contact Us'});
        }]);

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

    function ContactUsController($scope, $routeParams, submitContactUsMessage, topicMessageDispatcher, config, localeResolver, fetchAccountMetadata) {
        var self = this;
        this.errors = {};
        this.mailConfig = {};

        $scope.init = function(mailConfig) {
            self.mailConfig = mailConfig;
        };

        var reset = function() {
            $scope.replyTo = '';
            $scope.subject = '';
            $scope.message = '';
            $scope.name = '';
            $scope.mail = {};
        };

        var onSuccess = function() {
            $scope.sent = true;
            $scope.sending = false;
            reset();
            if(self.mailConfig.success) self.mailConfig.success();
            if (self.mailConfig.successNotification != false) {
                topicMessageDispatcher.fire('system.success', {
                    code:'contact.us.sent',
                    default:'Your message was delivered successfully, thank you.'
                });
                topicMessageDispatcher.fire('contact.us.submit.success','');
            }
        };

        var onError = function(body, status) {
            $scope.sending = false;
            if(status == 412) self.errors = body;
            else topicMessageDispatcher.fire('system.alert', status);
        };

        $scope.submit = function() {
            self.errors = {};
            $scope.sending = true;

            var data = {};

            if(self.mailConfig.useMailContext && $scope.mail) {
                var mail = $scope.mail;
                data = {
                    replyTo: mail.replyTo,
                    message: mail.message
                };
                if (mail.name) data.name = mail.name;
                if (mail.subject && mail.name) data.subject = mail.name + ': ' + mail.subject;
                else if(mail.subject) data.subject = mail.subject;
            } else {
                data = {
                    replyTo: $scope.replyTo,
                    message: $scope.message
                };
                if ($scope.subject && $scope.name) data.subject = $scope.name + ': ' + $scope.subject;
                else if($scope.subject && !$scope.name) data.subject = $scope.subject;
                else if(!$scope.subject && $scope.name) data.subject = $scope.name;
            }

            if(config.namespace) data.namespace = config.namespace;
            data.locale = localeResolver();
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
        $scope.mail.subject = extractSubjectFromRouteOrEmpty();

        fetchAccountMetadata({
            ok: function (metadata) {
                if (metadata.email) {
                    $scope.replyTo = metadata.email;
                    $scope.mail.replyTo = metadata.email;
                }
            }
        });
    }
})();
