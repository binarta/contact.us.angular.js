(function () {
    angular.module('contact.us', ['ngRoute', 'notifications', 'config', 'binarta-checkpointjs-angular1', 'binarta-applicationjs-angular1', 'contact.us.templates'])
        .factory('submitContactUsMessage', ['binarta', function (binarta) {
            return SubmitContactUsMessageFactory(binarta);
        }])
        .component('binContactForm', new BinContactFormComponent())
        .component('binContactFormField', new BinContactFormFieldComponent())
        .component('binContactFormSubmit', new BinContactFormSubmitComponent())
        .controller('ContactUsController', ['$scope', '$routeParams', '$location', 'submitContactUsMessage', 'topicMessageDispatcher', 'config', 'localeResolver', 'binarta', '$log', ContactUsController])
        .config(['$routeProvider', function ($routeProvider) {
            $routeProvider
                .when('/contact', {templateUrl: 'partials/contact.html'})
                .when('/contact/:subject', {templateUrl: 'partials/contact.html'})
                .when('/:locale/contact', {templateUrl: 'partials/contact.html'})
                .when('/:locale/contact/:subject', {templateUrl: 'partials/contact.html'});
        }]);

    function SubmitContactUsMessageFactory(binarta) {
        return function (data, response) {
            binarta.application.gateway.submitContactForm(data, response);
        }
    }

    function BinContactFormComponent() {
        this.template = '<form ng-submit="$ctrl.submit()" ng-transclude></form>';

        this.transclude = true;

        this.bindings = {
            successNotification: '@',
            onSent: '&'
        };

        this.controller = ['$element', '$location', '$routeParams', 'config', 'binarta', 'topicMessageDispatcher',
            function ($element, $location, $routeParams, config, binarta, topicMessageDispatcher) {
                var $ctrl = this;
                $ctrl.data = {};
                $ctrl.violations = {};
                var profile = binarta.checkpoint.profile;

                $ctrl.$onInit = function () {
                    reset();
                    if ($routeParams.subject) $ctrl.data.subject = $routeParams.subject;

                    $ctrl.submit = function () {
                        $ctrl.sending = true;

                        var data = $ctrl.data;
                        if (data.subject) {
                            data.originalSubject = data.subject;
                            if (data.name) data.subject = data.name + ': ' + data.subject;
                        }
                        data.location = {
                            host: $location.host(),
                            absUrl: $location.absUrl()
                        };
                        data.namespace = config.namespace;
                        data.locale = binarta.application.locale();
                        binarta.application.gateway.submitContactForm(data, {success: onSuccess, rejected: onError});
                    };

                    var profileObserver = profile.eventRegistry.observe({
                        signedin: prefillReplyToFromAccount
                    });

                    prefillReplyToFromAccount();

                    $ctrl.$onDestroy = function () {
                        profileObserver.disconnect();
                    };
                };

                function onSuccess() {
                    $element.trigger('contact.us.sent');
                    $ctrl.sending = false;
                    reset();
                    if ($ctrl.onSent) $ctrl.onSent();
                    if ($ctrl.successNotification !== 'false')
                        topicMessageDispatcher.fire('system.success', {code: 'contact.us.sent'});
                }

                function onError(body, status) {
                    $ctrl.sending = false;
                    if (status === 412) $ctrl.violations = body;
                    else topicMessageDispatcher.fire('system.alert', status);
                }

                function reset() {
                    for (var key in $ctrl.data) {
                        delete $ctrl.data[key];
                    }
                    $ctrl.violations = {};
                }

                function prefillReplyToFromAccount() {
                    if (profile.hasPermission('edit.mode')) return;
                    var metadata = profile.metadata();
                    if (metadata.email) if (!$ctrl.data.replyTo) $ctrl.data.replyTo = metadata.email;
                }
            }];
    }

    function BinContactFormFieldComponent() {
        this.templateUrl = 'bin-contact-form-field.html';

        this.require = {
            formCtrl: '^^binContactForm'
        };

        this.bindings = {
            fieldName: '@',
            fieldType: '@',
            value: '@'
        };

        this.controller = [function () {
            var $ctrl = this;

            $ctrl.$onInit = function () {
                $ctrl.isInvalid = function () {
                    return angular.isDefined($ctrl.formCtrl.violations[$ctrl.fieldName]);
                };

                $ctrl.getViolation = function () {
                    if ($ctrl.isInvalid()) return $ctrl.formCtrl.violations[$ctrl.fieldName][0];
                };

                $ctrl.data = $ctrl.formCtrl.data;
                $ctrl.isSending = function () {
                    return $ctrl.formCtrl.sending;
                };
                $ctrl.fieldId = 'binContactForm-' + $ctrl.fieldName;

            };

            $ctrl.$onChanges = function () {
                if ($ctrl.value) $ctrl.data[$ctrl.fieldName] = $ctrl.value;
            };
        }];
    }

    function BinContactFormSubmitComponent() {
        this.templateUrl = 'bin-contact-form-submit.html';

        this.require = {
            formCtrl: '^^binContactForm'
        };

        this.controller = [function () {
            var $ctrl = this;

            $ctrl.$onInit = function () {
                $ctrl.isSending = function () {
                    return $ctrl.formCtrl.sending;
                };
            };
        }];
    }

    function ContactUsController($scope, $routeParams, $location, submitContactUsMessage, topicMessageDispatcher, config, localeResolver, binarta, $log) {
        $log.warn('@deprecated ContactUsController - use the binContactForm components instead!');

        var self = this;
        this.errors = {};
        this.mailConfig = {};
        var profile = binarta.checkpoint.profile;

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
            if (self.mailConfig.successNotification !== false) {
                topicMessageDispatcher.fire('system.success', {
                    code: 'contact.us.sent',
                    default: 'Your message was delivered successfully, thank you.'
                });
                topicMessageDispatcher.fire('contact.us.submit.success', '');
            }
        };

        var onError = function (body, status) {
            $scope.sending = false;
            if (status === 412) self.errors = body;
            else topicMessageDispatcher.fire('system.alert', status);
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
            } else {
                data = {
                    replyTo: $scope.replyTo,
                    message: $scope.message
                };
                if ($scope.subject && $scope.name) data.subject = $scope.name + ': ' + $scope.subject;
                else if ($scope.subject && !$scope.name) data.subject = $scope.subject;
                else if (!$scope.subject && $scope.name) data.subject = $scope.name;
            }
            data.location = {
                host: $location.host(),
                absUrl: $location.absUrl()
            };

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


        var profileObserver = profile.eventRegistry.observe({
            signedin: prefillReplyToFromAccount
        });

        function prefillReplyToFromAccount() {
            if (!profile.hasPermission('edit.mode')) {
                var metadata = profile.metadata();
                if (metadata.email) {
                    if (!$scope.replyTo) $scope.replyTo = metadata.email;
                    if (!$scope.mail.replyTo) $scope.mail.replyTo = metadata.email;
                }
            }
        }

        prefillReplyToFromAccount();

        $scope.$on('$destroy', profileObserver.disconnect);
    }
})();
