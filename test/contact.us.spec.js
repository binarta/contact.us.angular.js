angular.module('config', []);

describe('contact-us', function () {
    var scope, dispatcher, config, localeResolver, $location, binarta, gateway, callbacks;

    beforeEach(module('contact.us'));
    beforeEach(inject(function ($rootScope, _$location_, _binarta_) {
        localeResolver = jasmine.createSpy('localeResolver');
        localeResolver.and.returnValue('locale');
        scope = $rootScope.$new();
        config = {};
        dispatcher = {
            fire: function (topic, msg) {
                dispatcher[topic] = msg;
            }
        };
        $location = _$location_;
        binarta = _binarta_;
        gateway = binarta.application.gateway;
        spyOn(gateway, 'submitContactForm');
        callbacks = {success: jasmine.any(Function), rejected: jasmine.any(Function)};
        binarta.checkpoint.gateway.permissions = [];
    }));

    describe('ContactUsController', function () {
        var ctrl;

        function createController($controller) {
            ctrl = $controller('ContactUsController', {
                $scope: scope,
                topicMessageDispatcher: dispatcher,
                config: config,
                localeResolver: localeResolver
            });
        }

        beforeEach(inject(createController));

        it('on init', function () {
            expect(scope.replyTo).toEqual("");
            expect(scope.subject).toEqual("");
            expect(scope.message).toEqual("");
            expect(scope.name).toEqual("");
        });

        describe('given a subject is encoded in the current route', function () {
            beforeEach(inject(function ($routeParams) {
                $routeParams.subject = 'subject';
            }));

            describe('at construction time', function () {
                beforeEach(inject(createController));

                it('then pre-fill subject', inject(function ($routeParams) {
                    expect(scope.subject).toEqual($routeParams.subject);
                    expect(scope.mail.subject).toEqual($routeParams.subject);
                }));
            });
        });

        describe('given that the user is logged in', function () {
            beforeEach(function () {
                binarta.checkpoint.registrationForm.submit({username: 'u', password: 'p', email: 'e'});
            });

            it('then pre-fill replyTo', function () {
                expect(scope.replyTo).toEqual('e');
                expect(scope.mail.replyTo).toEqual('e');
            });

            describe('at construction time', function () {
                beforeEach(inject(createController));

                it('then pre-fill replyTo', function () {
                    expect(scope.replyTo).toEqual('e');
                    expect(scope.mail.replyTo).toEqual('e');
                });
            });
        });

        describe('given that the user is logged in with edit.mode permission', function () {
            beforeEach(function () {
                binarta.checkpoint.gateway.addPermission('edit.mode');
                binarta.checkpoint.registrationForm.submit({username: 'u', password: 'p', email: 'e'});
            });

            describe('at construction time', function () {
                beforeEach(inject(createController));

                it('don not pre-fill replyTo', function () {
                    expect(scope.replyTo).toEqual('');
                    expect(scope.mail.replyTo).toBeUndefined();
                });
            });
        });

        describe('with previous replyTo value', function () {
            beforeEach(function () {
                scope.replyTo = 'email';
                scope.mail.replyTo = 'email';
            });

            describe('and user is logged in', function () {
                beforeEach(function () {
                    binarta.checkpoint.registrationForm.submit({username: 'u', password: 'p', email: 'e'});
                });

                it('do not update replyTo', function () {
                    expect(scope.replyTo).toEqual('email');
                    expect(scope.mail.replyTo).toEqual('email');
                });
            });
        });

        describe('on submit', function () {
            beforeEach(function () {
                scope.replyTo = 'dummy@thinkerit.be';
                scope.subject = 'subject';
                scope.message = 'message';
                scope.name = 'name';
            });

            describe('without config', function () {
                beforeEach(function () {
                    scope.submit();
                });

                it('has been called with correct params', function () {
                    expect(gateway.submitContactForm).toHaveBeenCalledWith(
                        {
                            replyTo: scope.replyTo,
                            subject: scope.name + ': ' + scope.subject,
                            message: scope.message,
                            locale: 'locale'
                        }, callbacks);
                });

                it('enter sending state', function () {
                    expect(scope.sending).toEqual(true);
                });

                it('reset form', function () {
                    gateway.submitContactForm.calls.first().args[1].success();
                    expect(scope.sending).toEqual(false);
                    expect(scope.sent).toEqual(true);
                    expect(scope.replyTo).toEqual("");
                    expect(scope.subject).toEqual("");
                    expect(scope.message).toEqual("");
                    expect(scope.name).toEqual("");
                });
            });

            describe('with config', function () {
                beforeEach(function () {
                    config.baseUri = 'http://host/context/';
                    config.namespace = 'spec';
                });

                describe('without mail context', function () {
                    it('with all params', function () {
                        scope.submit();
                        expect(gateway.submitContactForm).toHaveBeenCalledWith({
                            replyTo: scope.replyTo,
                            subject: scope.name + ': ' + scope.subject,
                            message: scope.message,
                            namespace: config.namespace,
                            locale: 'locale'
                        }, callbacks);
                    });
                });

                describe('with mail context', function () {
                    beforeEach(function () {
                        scope.init({useMailContext: true});
                    });

                    it('with all params', function () {
                        scope.mail = {
                            replyTo: 'dummy@thinkerit.be',
                            subject: 'subject',
                            message: 'message',
                            name: 'name'
                        };
                        scope.submit();
                        expect(gateway.submitContactForm).toHaveBeenCalledWith({
                            subject:  scope.mail.subject,
                            originalSubject: 'subject',
                            replyTo: scope.mail.replyTo,
                            message: scope.mail.message,
                            name: scope.mail.name,
                            namespace: config.namespace,
                            locale: 'locale',
                            location: {
                                host: 'server',
                                absUrl: 'http://server/'
                            }
                        }, callbacks);

                    });

                    it('without subject', function () {
                        scope.mail = {
                            replyTo: 'dummy@thinkerit.be',
                            message: 'without subject',
                            name: 'name'
                        };
                        scope.submit();
                        expect(gateway.submitContactForm).toHaveBeenCalledWith({
                            replyTo: scope.mail.replyTo,
                            message: scope.mail.message,
                            name: scope.mail.name,
                            namespace: config.namespace,
                            originalSubject: undefined,
                            locale: 'locale',
                            location: {
                                host: 'server',
                                absUrl: 'http://server/'
                            }
                        }, callbacks);
                    });

                    it('without name', function () {
                        scope.mail = {
                            replyTo: 'dummy@thinkerit.be',
                            subject: 'subject',
                            message: 'message'
                        };
                        scope.submit();
                        expect(gateway.submitContactForm).toHaveBeenCalledWith({
                            subject: 'subject',
                            originalSubject: 'subject',
                            replyTo: scope.mail.replyTo,
                            message: scope.mail.message,
                            namespace: config.namespace,
                            locale: 'locale',
                            location: {
                                host: 'server',
                                absUrl: 'http://server/'
                            }
                        }, callbacks);
                    });

                    it('location information is sent', function () {
                        scope.mail = {
                            replyTo: 'dummy@thinkerit.be',
                            message: 'message'
                        };
                        scope.submit();
                        expect(gateway.submitContactForm).toHaveBeenCalledWith({
                            replyTo: scope.mail.replyTo,
                            message: scope.mail.message,
                            namespace: config.namespace,
                            locale: 'locale',
                            originalSubject: undefined,
                            location: {
                                host: 'server',
                                absUrl: 'http://server/'
                            }
                        }, callbacks);
                    });

                    it('with dynamic content', function () {
                        scope.mail = {
                            dynamic: 'foo'
                        };
                        scope.submit();
                        expect(gateway.submitContactForm).toHaveBeenCalledWith({
                            dynamic: 'foo',
                            namespace: config.namespace,
                            locale: 'locale',
                            originalSubject: undefined,
                            location: {
                                host: 'server',
                                absUrl: 'http://server/'
                            }
                        }, callbacks)
                    });
                });
            });
        });

        it('on submit without name', function () {
            scope.replyTo = 'dummy@thinkerit.be';
            scope.subject = 'subject';
            scope.message = 'message';
            scope.submit();
            expect(gateway.submitContactForm).toHaveBeenCalledWith({
                replyTo: scope.replyTo,
                subject: scope.subject,
                message: scope.message,
                locale: 'locale'
            }, callbacks);
            expect(scope.sending).toEqual(true);

            gateway.submitContactForm.calls.first().args[1].success();
            expect(scope.sending).toEqual(false);
            expect(scope.sent).toEqual(true);
            expect(scope.replyTo).toEqual("");
            expect(scope.subject).toEqual("");
            expect(scope.message).toEqual("");
        });

        it('on submit success execute passed in success handler', function () {
            var successHandlerExecuted = false;
            var success = function () {
                successHandlerExecuted = true;
            };
            scope.init({success: success});
            scope.submit();
            gateway.submitContactForm.calls.first().args[1].success();
            expect(successHandlerExecuted).toEqual(true);
        });

        it('on submit success raise system.success notification', function () {
            scope.submit();
            gateway.submitContactForm.calls.first().args[1].success();
            expect(dispatcher['system.success']).toEqual({
                code: 'contact.us.sent',
                default: 'Your message was delivered successfully, thank you.'
            });
        });

        it('on submit success raise contact.us.submit.success notification', function () {
            scope.submit();
            gateway.submitContactForm.calls.first().args[1].success();
            expect(dispatcher['contact.us.submit.success']).toEqual('');
        });

        describe('when initialized with successNotification flag disabled', function () {
            beforeEach(function () {
                scope.init({
                    successNotification: false
                });
            });

            it('do not send success notifications', function () {
                scope.submit();
                gateway.submitContactForm.calls.first().args[1].success();
                expect(dispatcher['system.success']).toBeUndefined();
                expect(dispatcher['contact.us.submit.success']).toBeUndefined();
            });
        });

        it('on submit error raise system.alert notification', function () {
            scope.submit();
            gateway.submitContactForm.calls.first().args[1].rejected({}, 500);
            expect(dispatcher['system.alert']).toEqual(500);
        });

        it('empty error class', function () {
            expect(scope.errorClassFor('field')).toEqual('')
        });

        it('on submit rejected', function () {
            scope.submit();
            expect(scope.sending).toEqual(true);

            gateway.submitContactForm.calls.first().args[1].rejected({field: ['violation']}, 412);
            expect(scope.sending).toEqual(false);
            expect(scope.errorClassFor('field')).toEqual('error');
            expect(scope.violations('field')).toEqual(['violation']);
            expect(dispatcher['system.alert']).toBeUndefined();
        });

        it('submit resets errors', function () {
            ctrl.errors = {field: ['error']};
            scope.submit();
            gateway.submitContactForm.calls.first().args[1].success();
            expect(scope.errorClassFor('field')).toEqual('');
        });

        it('confirm mail sent', function () {
            scope.sent = true;
            scope.confirm();
            expect(scope.sent).toEqual(false);
        });

        describe('on destroy', function () {
            beforeEach(function () {
                scope.$destroy();
            });

            describe('on signin', function () {
                beforeEach(function () {
                    binarta.checkpoint.registrationForm.submit({username: 'u', password: 'p', email: 'e'});
                });

                it('do not pre-fill replyTo', function () {
                    expect(scope.replyTo).toEqual('');
                    expect(scope.mail.replyTo).toBeUndefined();
                });
            });
        });
    });
});
