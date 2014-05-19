describe('contact-us', function () {
    var scope, $httpBackend, dispatcher, config;

    beforeEach(module('contact.us'));
    beforeEach(inject(function ($rootScope, $injector) {
        scope = $rootScope.$new();
        config = {};
        $httpBackend = $injector.get('$httpBackend');
        dispatcher = {
            fire: function (topic, msg) {
                dispatcher[topic] = msg;
            }
        };
    }));
    afterEach(function () {
        $httpBackend.verifyNoOutstandingExpectation();
        $httpBackend.verifyNoOutstandingRequest();
    });

    describe('ContactUsController', function() {
        var ctrl;

        function createController($controller) {
            ctrl = $controller(ContactUsController, {$scope:scope, topicMessageDispatcher:dispatcher, config:config});
        }

        beforeEach(inject(createController));

        it('on init', function() {
            expect(scope.replyTo).toEqual("");
            expect(scope.subject).toEqual("");
            expect(scope.message).toEqual("");
            expect(scope.name).toEqual("");
        });

        describe('given a subject is encoded in the current route', function() {
            beforeEach(inject(function($routeParams) {
                $routeParams.subject = 'subject';
            }));

            describe('at construction time', function() {
                beforeEach(inject(createController));

                it('then pre-fill subject', inject(function($routeParams) {
                    expect(scope.subject).toEqual($routeParams.subject);
                    expect(scope.mail.subject).toEqual($routeParams.subject);
                }));
            });
        });

        describe('on submit', function() {
            beforeEach(function() {
                scope.replyTo = 'dummy@thinkerit.be';
                scope.subject = 'subject';
                scope.message = 'message';
                scope.name = 'name';
            });

            describe('without config', function() {
                beforeEach(function() {
                    $httpBackend.expect('POST', 'api/contact/us', {
                        replyTo:scope.replyTo,
                        subject:scope.name + ': ' + scope.subject,
                        message:scope.message
                    }).respond(201, '');

                    scope.submit();
                });

                it('enter sending state', function() {
                    expect(scope.sending).toEqual(true);
                    $httpBackend.flush();
                });

                it('reset form', function() {
                    $httpBackend.flush();

                    expect(scope.sending).toEqual(false);
                    expect(scope.sent).toEqual(true);
                    expect(scope.replyTo).toEqual("");
                    expect(scope.subject).toEqual("");
                    expect(scope.message).toEqual("");
                    expect(scope.name).toEqual("");
                });
            });

            it('with config', function() {
                config.baseUri = 'http://host/context/';
                config.namespace = 'spec';
                $httpBackend.expect('POST', config.baseUri + 'api/contact/us', {
                    replyTo:scope.replyTo,
                    subject:scope.name + ': ' + scope.subject,
                    message:scope.message,
                    namespace:config.namespace
                }).respond(201, '');

                scope.submit();

                $httpBackend.flush();
            });

            it('with mail context', function() {
                scope.init({useMailContext:true});

                scope.mail.replyTo = 'dummy@thinkerit.be';
                scope.mail.subject = 'subject';
                scope.mail.message = 'message';
                scope.mail.name = 'name';

                config.baseUri = 'http://host/context/';
                config.namespace = 'spec';
                $httpBackend.expect('POST', config.baseUri + 'api/contact/us', {
                    subject:scope.mail.name + ': ' + scope.mail.subject,
                    replyTo:scope.mail.replyTo,
                    message:scope.mail.message,
                    name:scope.mail.name,
                    namespace:config.namespace
                }).respond(201, '');

                scope.submit();

                $httpBackend.flush();
            });
        });

        it('on submit without name', function() {
            scope.replyTo = 'dummy@thinkerit.be';
            scope.subject = 'subject';
            scope.message = 'message';

            $httpBackend.expect('POST', 'api/contact/us', {
                replyTo:scope.replyTo,
                subject:scope.subject,
                message:scope.message
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

        it('on submit success raise system.success notification', function() {
            $httpBackend.expect('POST', /.*/).respond(201);
            scope.submit();
            $httpBackend.flush();
            expect(dispatcher['system.success']).toEqual({
                code:'contact.us.sent',
                default:'Your message was delivered successfully, thank you.'
            });
        });

        it('on submit success raise contact.us.submit.success notification', function() {
            $httpBackend.expect('POST', /.*/).respond(201);
            scope.submit();
            $httpBackend.flush();
            expect(dispatcher['contact.us.submit.success']).toEqual('');
        });

        it('on submit error raise system.alert notification', function() {
            $httpBackend.expect('POST', /.*/).respond(500);
            scope.submit();
            $httpBackend.flush();
            expect(dispatcher['system.alert']).toEqual(500);
        });

        it('empty error class', function() {
            expect(scope.errorClassFor('field')).toEqual('')
        });

        it('on submit rejected', function() {
            $httpBackend.when('POST', /.*/).respond(412, {field:['violation']});
            scope.submit();

            expect(scope.sending).toEqual(true);

            $httpBackend.flush();

            expect(scope.sending).toEqual(false);
            expect(scope.errorClassFor('field')).toEqual('error');
            expect(scope.violations('field')).toEqual(['violation']);
        });

        it('submit resets errors', function() {
            $httpBackend.when('POST', /.*/).respond(201, '');
            ctrl.errors = {field:['error']};
            scope.submit();
            $httpBackend.flush();
            expect(scope.errorClassFor('field')).toEqual('');
        });

        it('confirm mail sent', function() {
            scope.sent = true;
            scope.confirm();
            expect(scope.sent).toEqual(false);
        });
    });
});