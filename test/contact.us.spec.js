angular.module('config', []);

describe('contact-us', function () {
    var scope, $httpBackend, dispatcher, config, localeResolver, $location;

    beforeEach(module('contact.us'));
    beforeEach(inject(function ($rootScope, $injector, _$location_) {
        localeResolver = jasmine.createSpy('localeResolver');
        localeResolver.and.returnValue('locale');
        scope = $rootScope.$new();
        config = {};
        $httpBackend = $injector.get('$httpBackend');
        dispatcher = {
            fire: function (topic, msg) {
                dispatcher[topic] = msg;
            }
        };
        $location = _$location_;
    }));
    afterEach(function () {
        $httpBackend.verifyNoOutstandingExpectation();
        $httpBackend.verifyNoOutstandingRequest();
    });

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
            beforeEach(inject(function (fetchAccountMetadata) {
                fetchAccountMetadata.calls.first().args[0].ok({
                    email: 'email'
                });
            }));

            describe('and the user has no edit.mode permission', function () {
                beforeEach(inject(function (activeUserHasPermission) {
                    activeUserHasPermission.calls.first().args[0].no();
                }));

                it('then pre-fill replyTo', function () {
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
                    $httpBackend.expect('POST', 'api/contact/us', {
                        replyTo: scope.replyTo,
                        subject: scope.name + ': ' + scope.subject,
                        message: scope.message,
                        locale: 'locale'
                    }).respond(201, '');

                    scope.submit();
                });

                it('enter sending state', function () {
                    expect(scope.sending).toEqual(true);
                    $httpBackend.flush();
                });

                it('reset form', function () {
                    $httpBackend.flush();

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
                        $httpBackend.expect('POST', config.baseUri + 'api/contact/us', {
                            replyTo: scope.replyTo,
                            subject: scope.name + ': ' + scope.subject,
                            message: scope.message,
                            namespace: config.namespace,
                            locale: 'locale'
                        }).respond(201, '');

                        scope.submit();

                        $httpBackend.flush();
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

                        $httpBackend.expect('POST', config.baseUri + 'api/contact/us', {
                            subject: scope.mail.name + ': ' + scope.mail.subject,
                            originalSubject: scope.mail.subject,
                            replyTo: scope.mail.replyTo,
                            message: scope.mail.message,
                            name: scope.mail.name,
                            namespace: config.namespace,
                            locale: 'locale',
                            location: {
                                host: 'server',
                                absUrl: 'http://server/'
                            }
                        }).respond(201, '');

                        scope.submit();

                        $httpBackend.flush();
                    });

                    it('without subject', function () {
                        scope.mail = {
                            replyTo: 'dummy@thinkerit.be',
                            message: 'without subject',
                            name: 'name'
                        };

                        $httpBackend.expect('POST', config.baseUri + 'api/contact/us', {
                            replyTo: scope.mail.replyTo,
                            message: scope.mail.message,
                            name: scope.mail.name,
                            namespace: config.namespace,
                            locale: 'locale',
                            location: {
                                host: 'server',
                                absUrl: 'http://server/'
                            }
                        }).respond(201, '');

                        scope.submit();

                        $httpBackend.flush();
                    });

                    it('without name', function () {
                        scope.mail = {
                            replyTo: 'dummy@thinkerit.be',
                            subject: 'subject',
                            message: 'message'
                        };

                        $httpBackend.expect('POST', config.baseUri + 'api/contact/us', {
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
                        }).respond(201, '');

                        scope.submit();

                        $httpBackend.flush();
                    });

                    it('location information is sent', function () {
                        scope.mail = {
                            replyTo: 'dummy@thinkerit.be',
                            message: 'message'
                        };

                        $httpBackend.expect('POST', config.baseUri + 'api/contact/us', {
                            replyTo: scope.mail.replyTo,
                            message: scope.mail.message,
                            namespace: config.namespace,
                            locale: 'locale',
                            location: {
                                host: 'server',
                                absUrl: 'http://server/'
                            }
                        }).respond(201, '');

                        scope.submit();

                        $httpBackend.flush();
                    });

                    it('with dynamic content', function () {
                        scope.mail = {
                            dynamic: 'foo'
                        };

                        $httpBackend.expect('POST', config.baseUri + 'api/contact/us', {
                            dynamic: 'foo',
                            namespace: config.namespace,
                            locale: 'locale',
                            location: {
                                host: 'server',
                                absUrl: 'http://server/'
                            }
                        }).respond(201, '');

                        scope.submit();

                        $httpBackend.flush();
                    });
                });
            });
        });

        it('on submit without name', function () {
            scope.replyTo = 'dummy@thinkerit.be';
            scope.subject = 'subject';
            scope.message = 'message';

            $httpBackend.expect('POST', 'api/contact/us', {
                replyTo: scope.replyTo,
                subject: scope.subject,
                message: scope.message,
                locale: 'locale'
            }).respond(201, '');

            scope.submit();

            expect(scope.sending).toEqual(true);

            $httpBackend.flush();

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
            $httpBackend.expect('POST', /.*/).respond(201);
            scope.submit();
            $httpBackend.flush();

            expect(successHandlerExecuted).toEqual(true);
        });

        it('on submit success raise system.success notification', function () {
            $httpBackend.expect('POST', /.*/).respond(201);
            scope.submit();
            $httpBackend.flush();
            expect(dispatcher['system.success']).toEqual({
                code: 'contact.us.sent',
                default: 'Your message was delivered successfully, thank you.'
            });
        });

        it('on submit success raise contact.us.submit.success notification', function () {
            $httpBackend.expect('POST', /.*/).respond(201);
            scope.submit();
            $httpBackend.flush();
            expect(dispatcher['contact.us.submit.success']).toEqual('');
        });


        describe('when initialized with successNotification flag disabled', function () {
            beforeEach(function () {
                scope.init({
                    successNotification: false
                });
            });

            it('do not send success notifications', function () {
                $httpBackend.expect('POST', /.*/).respond(201);
                scope.submit();
                $httpBackend.flush();
                expect(dispatcher['system.success']).toBeUndefined();
                expect(dispatcher['contact.us.submit.success']).toBeUndefined();
            });
        });

        it('on submit error raise system.alert notification', function () {
            $httpBackend.expect('POST', /.*/).respond(500);
            scope.submit();
            $httpBackend.flush();
            expect(dispatcher['system.alert']).toEqual(500);
        });

        it('empty error class', function () {
            expect(scope.errorClassFor('field')).toEqual('')
        });

        it('on submit rejected', function () {
            $httpBackend.when('POST', /.*/).respond(412, {field: ['violation']});
            scope.submit();

            expect(scope.sending).toEqual(true);

            $httpBackend.flush();

            expect(scope.sending).toEqual(false);
            expect(scope.errorClassFor('field')).toEqual('error');
            expect(scope.violations('field')).toEqual(['violation']);
        });

        it('submit resets errors', function () {
            $httpBackend.when('POST', /.*/).respond(201, '');
            ctrl.errors = {field: ['error']};
            scope.submit();
            $httpBackend.flush();
            expect(scope.errorClassFor('field')).toEqual('');
        });

        it('confirm mail sent', function () {
            scope.sent = true;
            scope.confirm();
            expect(scope.sent).toEqual(false);
        });
    });
});
