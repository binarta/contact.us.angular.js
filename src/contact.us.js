(function () {

    angular.module('contact.us', ['ngRoute', 'notifications', 'config', 'checkpoint', 'binarta-applicationjs-angular1'])
        .factory('submitContactUsMessage', ['binarta', function (binarta) {
            return SubmitContactUsMessageFactory(binarta);
        }])
        .controller('ContactUsController', ['$scope', '$routeParams', '$location', 'submitContactUsMessage', 'topicMessageDispatcher', 'config', 'localeResolver', 'fetchAccountMetadata', 'activeUserHasPermission', ContactUsController])
        .config(['$routeProvider', function ($routeProvider) {
            $routeProvider
                .when('/contact', {templateUrl: 'partials/contact.html', title: 'Contact Us'})
                .when('/contact/:subject', {templateUrl: 'partials/contact.html', title: 'Contact Us'})
                .when('/:locale/contact', {templateUrl: 'partials/contact.html', title: 'Contact Us'})
                .when('/:locale/contact/:subject', {templateUrl: 'partials/contact.html', title: 'Contact Us'});
        }]);


    function SubmitContactUsMessageFactory(binarta) {
        return function (data, response) {
            binarta.application.gateway.submitContactForm(data, response);
        }
    }

    function ContactUsController($scope, $routeParams, $location, submitContactUsMessage, topicMessageDispatcher, config, localeResolver, fetchAccountMetadata, activeUserHasPermission) {
        var self = this;
        this.errors = {};
        this.mailConfig = {};

        $scope.init = function (mailConfig) {
            self.mailConfig = mailConfig;
        };

        var reset = function () {
            $scope.replyTo = '';
            $scope.subject = '';
            $scope.message = '';
            $scope.name = '';
            $scope.mail = {};
        };

        var onSuccess = function () {
            $scope.sent = true;
            $scope.sending = false;
            reset();
            if (self.mailConfig.success) self.mailConfig.success();
            if (self.mailConfig.successNotification != false) {
                topicMessageDispatcher.fire('system.success', {
                    code: 'contact.us.sent',
                    default: 'Your message was delivered successfully, thank you.'
                });
                topicMessageDispatcher.fire('contact.us.submit.success', '');
            }
        };

        var onError = function (body, status) {
            $scope.sending = false;
            if (status == 412) self.errors = body;
            topicMessageDispatcher.fire('system.alert', status);
        };

        $scope.submit = function () {
            self.errors = {};
            $scope.sending = true;

            var data = {};
            if (self.mailConfig.useMailContext && $scope.mail) {
                data = $scope.mail;
                data.originalSubject = data.subject;
                if (data.subject && data.name) {
                    data.subject = data.name + ': ' + data.subject;
                }
                data.location = {
                    host: $location.host(),
                    absUrl: $location.absUrl()
                };
            } else {
                data = {
                    replyTo: $scope.replyTo,
                    message: $scope.message
                };
                if ($scope.subject && $scope.name) data.subject = $scope.name + ': ' + $scope.subject;
                else if ($scope.subject && !$scope.name) data.subject = $scope.subject;
                else if (!$scope.subject && $scope.name) data.subject = $scope.name;
            }

            if (config.namespace) data.namespace = config.namespace;
            data.locale = localeResolver();
            submitContactUsMessage(data, {success: onSuccess, rejected: onError});
        };

        $scope.confirm = function () {
            $scope.sent = false;
        };

        $scope.errorClassFor = function (key) {
            return self.errors[key] ? 'error' : '';
        };

        $scope.violations = function (key) {
            return self.errors[key];
        };

        this.getScope = function () {
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
                activeUserHasPermission({
                    no: function () {
                        if (metadata.email) {
                            $scope.replyTo = metadata.email;
                            $scope.mail.replyTo = metadata.email;
                        }
                    },
                    scope: $scope
                }, 'edit.mode');
            }
        });
    }
})();
