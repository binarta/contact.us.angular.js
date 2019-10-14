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
                            locale: 'locale',
                            location: {
                                host: 'server',
                                absUrl: 'http://server/'
                            }
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
                            locale: 'locale',
                            location: {
                                host: 'server',
                                absUrl: 'http://server/'
                            }
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
                locale: 'locale',
                location: {
                    host: 'server',
                    absUrl: 'http://server/'
                }
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

    describe('binContactForm component', function () {
        var $ctrl, $element, namespace, locale, dispatcher;

        beforeEach(inject(function ($componentController, config, topicMessageDispatcherMock) {
            namespace = 'namespace';
            locale = 'L';
            config.namespace = namespace;
            dispatcher = topicMessageDispatcherMock;
            binarta.application.setLocale(locale);
            $element = jasmine.createSpyObj('$element', ['trigger'])
            $ctrl = $componentController('binContactForm', {$element: $element});
        }));

        describe('on init', function () {
            beforeEach(function () {
                $ctrl.$onInit();
            });

            it('empty data object', function () {
                expect($ctrl.data).toEqual({});
            });

            it('empty violations object', function () {
                expect($ctrl.violations).toEqual({});
            });

            it('is not sending', function () {
                expect($ctrl.sending).toBeFalsy();
            });

            describe('on submit with no fields', function () {
                beforeEach(function () {
                    $ctrl.submit();
                });

                it('gateway been called with correct params', function () {
                    expect(gateway.submitContactForm).toHaveBeenCalledWith(
                        {
                            locale: locale,
                            namespace: namespace,
                            location: {
                                host: 'server',
                                absUrl: 'http://server/'
                            }
                        }, callbacks);
                });
            });

            describe('on submit with fields', function () {
                beforeEach(function () {
                    $ctrl.data.replyTo = 'email';
                    $ctrl.data.name = 'name';
                    $ctrl.data.subject = 'subject';
                    $ctrl.data.message = 'message';
                    $ctrl.submit();
                });

                it('is sending', function () {
                    expect($ctrl.sending).toBeTruthy();
                });

                it('gateway been called with correct params', function () {
                    expect(gateway.submitContactForm).toHaveBeenCalledWith(
                        {
                            replyTo: 'email',
                            name: 'name',
                            message: 'message',
                            originalSubject: 'subject',
                            subject: 'name: subject',
                            locale: locale,
                            namespace: namespace,
                            location: {
                                host: 'server',
                                absUrl: 'http://server/'
                            }
                        }, callbacks);
                });

                describe('on submit error with server error', function () {
                    var violations;

                    beforeEach(function () {
                        violations = 'violations';
                        gateway.submitContactForm.calls.mostRecent().args[1].rejected(violations, 500);
                    });

                    it('is not sending', function () {
                        expect($ctrl.sending).toBeFalsy();
                    });

                    it('fire system alert', function () {
                        expect(dispatcher['system.alert']).toEqual(500);
                    });
                });

                describe('on submit error with precondition failed', function () {
                    var violations;

                    beforeEach(function () {
                        violations = 'violations';
                        gateway.submitContactForm.calls.mostRecent().args[1].rejected(violations, 412);
                    });

                    it('is not sending', function () {
                        expect($ctrl.sending).toBeFalsy();
                    });

                    it('violations are available', function () {
                        expect($ctrl.violations).toEqual(violations);
                    });

                    describe('on submit success', function () {
                        var dataRef;

                        beforeEach(function () {
                            dataRef = $ctrl.data;
                            gateway.submitContactForm.calls.mostRecent().args[1].success();
                        });

                        it('is not sending', function () {
                            expect($ctrl.sending).toBeFalsy();
                        });

                        it('violations are cleared', function () {
                            expect($ctrl.violations).toEqual({});
                        });

                        it('data is cleared', function () {
                            expect($ctrl.data).toEqual({});
                        });

                        it('data reference is not changed', function () {
                            expect($ctrl.data).toBe(dataRef);
                        });

                        it('success notification is fired', function () {
                            expect(dispatcher['system.success']).toEqual({code: 'contact.us.sent'});
                        });

                        it('fires an element event', function() {
                            expect($element.trigger).toHaveBeenCalledWith('contact.us.sent');
                        });
                    });

                    describe('on submit success and success notification is disabled', function () {
                        beforeEach(function () {
                            $ctrl.successNotification = 'false';
                            gateway.submitContactForm.calls.mostRecent().args[1].success();
                        });

                        it('success notification is not fired', function () {
                            expect(dispatcher['system.success']).toBeUndefined();
                        });
                    });

                    describe('on submit success with onSent callback', function () {
                        beforeEach(function () {
                            $ctrl.onSent = jasmine.createSpy('spy');
                            gateway.submitContactForm.calls.mostRecent().args[1].success();
                        });

                        it('callback is executed', function () {
                            expect($ctrl.onSent).toHaveBeenCalled();
                        });
                    });
                });
            });
        });

        describe('when subject is defined in route params', function () {
            beforeEach(inject(function ($routeParams) {
                $routeParams.subject = 'subject';
                $ctrl.$onInit();
            }));

            it('subject from route params is set', function () {
                expect($ctrl.data.subject).toEqual('subject');
            });
        });

        describe('given that the user is logged in', function () {
            beforeEach(function () {
                binarta.checkpoint.registrationForm.submit({username: 'u', password: 'p', email: 'e'});
            });

            describe('on init', function () {
                beforeEach(function () {
                    $ctrl.$onInit();
                });

                it('pre-fill replyTo', function () {
                    expect($ctrl.data.replyTo).toEqual('e');
                });
            });
        });

        describe('given that the user is logged in with edit.mode permission', function () {
            beforeEach(function () {
                binarta.checkpoint.gateway.addPermission('edit.mode');
                binarta.checkpoint.registrationForm.submit({username: 'u', password: 'p', email: 'e'});
            });

            describe('on init', function () {
                beforeEach(function () {
                    $ctrl.$onInit();
                });

                it('don not pre-fill replyTo', function () {
                    expect($ctrl.data.replyTo).toBeUndefined();
                });
            });
        });

        describe('with previous replyTo value', function () {
            beforeEach(function () {
                $ctrl.$onInit();
                $ctrl.data.replyTo = 'email';
            });

            describe('and user is logged in', function () {
                beforeEach(function () {
                    binarta.checkpoint.registrationForm.submit({username: 'u', password: 'p', email: 'e'});
                });

                it('do not update replyTo', function () {
                    expect($ctrl.data.replyTo).toEqual('email');
                });
            });
        });

        describe('on destroy', function () {
            beforeEach(function () {
                $ctrl.$onInit();
                $ctrl.$onDestroy();
            });

            describe('on signin', function () {
                beforeEach(function () {
                    binarta.checkpoint.registrationForm.submit({username: 'u', password: 'p', email: 'e'});
                });

                it('do not pre-fill replyTo', function () {
                    expect($ctrl.data.replyTo).toBeUndefined();
                });
            });
        });
    });

    describe('binContactFormField component', function () {
        var $ctrl;

        beforeEach(inject(function ($componentController) {
            $ctrl = $componentController('binContactFormField');
            $ctrl.formCtrl = {
                data: {
                    name: 'field'
                }
            };
            $ctrl.fieldName = 'name';
            $ctrl.$onInit();
        }));

        it('data reference is set', function () {
            expect($ctrl.data).toBe($ctrl.formCtrl.data);
        });

        it('field id is set', function () {
            expect($ctrl.fieldId).toEqual('binContactForm-' + $ctrl.fieldName);
        });

        it('when form is sending', function () {
            $ctrl.formCtrl.sending = true;
            expect($ctrl.isSending()).toBeTruthy();
        });

        it('when form is not sending', function () {
            $ctrl.formCtrl.sending = false;
            expect($ctrl.isSending()).toBeFalsy();
        });

        describe('when field is invalid', function () {
            beforeEach(function () {
                $ctrl.formCtrl.violations = {
                    name: ['error']
                };
            });

            it('is invalid', function () {
                expect($ctrl.isInvalid()).toBeTruthy();
            });

            it('get violation code', function () {
                expect($ctrl.getViolation()).toEqual('error');
            });
        });

        describe('when value is given', function () {
            beforeEach(function () {
                $ctrl.value = 'test';
                $ctrl.$onChanges();
            });

            it('data is updated with value', function () {
                expect($ctrl.data[$ctrl.fieldName]).toEqual('test');
            });
        });
    });

    describe('binContactFormSubmit component', function () {
        var $ctrl;

        beforeEach(inject(function ($componentController) {
            $ctrl = $componentController('binContactFormSubmit');
            $ctrl.formCtrl = {};
            $ctrl.$onInit();
        }));

        it('when form is sending', function () {
            $ctrl.formCtrl.sending = true;
            expect($ctrl.isSending()).toBeTruthy();
        });

        it('when form is not sending', function () {
            $ctrl.formCtrl.sending = false;
            expect($ctrl.isSending()).toBeFalsy();
        });
    });
});