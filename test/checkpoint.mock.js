angular.module('checkpoint', [])
    .factory('fetchAccountMetadata', function() {
        return jasmine.createSpy('fetchAccountMetadata');
    })
    .factory('activeUserHasPermission', function() {
        return jasmine.createSpy('activeUserHasPermission');
    });