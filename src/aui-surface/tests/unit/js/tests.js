YUI.add('aui-surface-tests', function(Y) {

    var noHTML5 = !(Y.config.win &&
        Y.config.win.history.pushState &&
        Y.config.win.history.replaceState &&
        ('onpopstate' in Y.config.win || Y.UA.gecko >= 2));

    var suite = new Y.Test.Suite('aui-surface');

    suite.add(new Y.Test.Case({
        name: 'Surface Tests',

        _should: {
            // Ignore all tests in browsers without HTML5 history support.
            ignore: {
                'should cancel pending navigate': noHTML5,
                'should dispatch to the current url': noHTML5,
                'should lazily match surface element': noHTML5,
                'should match screen routes': noHTML5,
                'should match surface elements': noHTML5,
                'should navigate fail using HTMLScreen': noHTML5,
                'should navigate to /base/delayed asynchronously': noHTML5,
                'should navigate to /base/page': noHTML5,
                'should navigate to next page': noHTML5,
                'should navigate to path with querystring': noHTML5,
                'should navigate to previous page asynchronously': noHTML5,
                'should navigate to previous page': noHTML5,
                'should navigate to routed link': noHTML5,
                'should navigate with events': noHTML5,
                'should navigate with screen lifecycle': noHTML5,
                'should not handle history states that are not ours': noHTML5,
                'should not navigate to offsite link': noHTML5,
                'should not navigate to outside base path link': noHTML5,
                'should not navigate to the same destination': noHTML5,
                'should not navigate to unrouted link': noHTML5,
                'should not navigate to unrouted route': noHTML5,
                'should not navigate when navigation cancelled by active screen': noHTML5,
                'should remember the scroll position': noHTML5 || Y.UA.ie,
                'should throw error when surface id is not found': noHTML5,
                'should update surfaces and title using HTMLScreen': noHTML5,
                'should update surfaces using HTMLScreen': noHTML5
            }
        },

        init: function() {
            this.regexRoute = /^\/regex\?foo=\w+$/;
            this.originalPath = this.getCurrentPath();

            this.app = new Y.SurfaceApp({
                basePath: '/base',
                linkSelector: 'a'
            });

            this.app.addScreenRoutes([
                new Y.ScreenRoute({
                    path: '/page',
                    screen: Y.PageScreen
                }),
                {
                    path: '/locked',
                    screen: Y.LockedScreen
                },
                {
                    path: '/lazy',
                    screen: Y.LazySurfaceScreen
                },
                {
                    path: this.regexRoute,
                    screen: Y.RegexScreen
                },
                {
                    path: function(value) {
                        return value === '/delayed';
                    },
                    screen: Y.DelayedScreen
                },
                {
                    path: {
                        unknown: true
                    },
                    screen: Y.Screen
                }
            ]);

            this.app.addSurfaces([
                new Y.Surface({
                    id: 'header'
                }),
                'body',
                'unknown'
            ]);
        },

        destroy: function() {
            this.app = null;
            Y.config.win.history.pushState(null, '', this.originalPath);
        },

        'should match screen routes': function() {
            var route = null;

            route = this.app.matchesRoute('/base/unknown');
            Y.Assert.isNull(route);

            route = this.app.matchesRoute('/base/page');
            Y.Assert.isInstanceOf(Y.ScreenRoute, route);
            Y.Assert.areEqual('/page', route.get('path'));

            route = this.app.matchesRoute('/base/regex?foo=1');
            Y.Assert.isInstanceOf(Y.ScreenRoute, route);
            Y.Assert.areEqual(this.regexRoute, route.get('path'));
        },

        'should throw error when surface id is not found': function() {
            Y.Assert.throwsError(Error, function() {
                new Y.Surface({
                    id: ''
                });
            });
        },

        'should match surface elements': function() {
            Y.Assert.areEqual(Y.one('#body'), this.app.surfaces.body.getEl());
            Y.Assert.areEqual(Y.one('#header'), this.app.surfaces.header.getEl());
        },

        'should lazily match surface element': function() {
            this.app.addSurfaces(
                new Y.Surface({
                    id: 'lazy'
                })
            );
            Y.Assert.isNull(this.app.surfaces.lazy.getEl());

            this.app.navigate('/base/lazy');

            setTimeout(function() {
                this.app.navigate('/base/page');
            }.bind(this), 100);

            setTimeout(function() {
                Y.one('body').append('<div id="lazy"/>');
                Y.Assert.isNotNull(this.app.surfaces.lazy.getEl());
                this.app.navigate('/base/lazy');
            }.bind(this), 200);

            this.wait(function() {
                this.assertEqualCurrentPath('/base/lazy');
                this.assertEqualSurfaceContent('lazy', 'lazy');
                this.assertEqualSurfaceContent('body', 'body-default');
                this.assertEqualSurfaceContent('header', 'header-default');
            }, 300);
        },

        'should not navigate to the same destination': function() {
            Y.Assert.isTrue(this.app.navigate('/base/page'));
            this.wait(function() {
                Y.one('a[href="/base/page"]').simulate('click');
                Y.Assert.isNull(this.app.pendingRequest);
            }, 100);
        },

        'should navigate to routed link': function() {
            Y.one('a[href="/base/regex?foo=1"]').simulate('click');
            this.wait(function() {
                this.assertEqualCurrentPath('/base/regex?foo=1');
                this.assertEqualSurfaceContent('body', 'body-regex');
                this.assertEqualSurfaceContent('header', 'header-regex');
                Y.Assert.areEqual('Regex', Y.config.doc.title);
            }, 100);
        },

        'should not navigate to offsite link': function() {
            var external = Y.one('a[href="http://alloyui.com/external"]');

            external.on('click', function(event) {
                event.preventDefault();
            });

            external.simulate('click');

            this.wait(function() {
                this.assertEqualCurrentPath('/base/regex?foo=1');
                this.assertEqualSurfaceContent('body', 'body-regex');
                this.assertEqualSurfaceContent('header', 'header-regex');
                Y.Assert.areEqual('Regex', Y.config.doc.title);
            }, 100);
        },

        'should not navigate to unrouted link': function() {
            var external = Y.one('a[href="/base/unrouted"]');

            external.on('click', function(event) {
                event.preventDefault();
            });

            external.simulate('click');

            this.wait(function() {
                this.assertEqualCurrentPath('/base/regex?foo=1');
                this.assertEqualSurfaceContent('body', 'body-regex');
                this.assertEqualSurfaceContent('header', 'header-regex');
                Y.Assert.areEqual('Regex', Y.config.doc.title);
            }, 100);
        },

        'should not navigate to outside base path link': function() {
            var external = Y.one('a[href="/outside"]');

            external.on('click', function(event) {
                event.preventDefault();
            });

            external.simulate('click');

            this.wait(function() {
                this.assertEqualCurrentPath('/base/regex?foo=1');
                this.assertEqualSurfaceContent('body', 'body-regex');
                this.assertEqualSurfaceContent('header', 'header-regex');
                Y.Assert.areEqual('Regex', Y.config.doc.title);
            }, 100);
        },

        'should not navigate to unrouted route': function() {
            Y.Assert.isFalse(this.app.navigate('/base/unrouted'));
            this.wait(function() {
                this.assertEqualCurrentPath('/base/regex?foo=1');
                this.assertEqualSurfaceContent('body', 'body-regex');
                this.assertEqualSurfaceContent('header', 'header-regex');
                Y.Assert.areEqual('Regex', Y.config.doc.title);
            }, 100);
        },

        'should cancel pending navigate': function() {
            this.app.navigate('/base/delayed');

            setTimeout(function() {
                this.app.navigate('/base/regex?foo=80');
            }.bind(this), 100);

            this.wait(function() {
                this.assertEqualCurrentPath('/base/regex?foo=80');
                this.assertEqualSurfaceContent('body', 'body-regex');
                this.assertEqualSurfaceContent('header', 'header-regex');
                Y.Assert.areEqual('Regex', Y.config.doc.title);
            }, 300);
        },

        'should navigate with events': function() {
            var startCalledAt = 0,
                endCalledAt = 0;

            this.app.on({
                startNavigate: function(event) {
                    startCalledAt = Date.now();
                    Y.ObjectAssert.ownsKey('path', event);
                    Y.ObjectAssert.ownsKey('route', event);
                    Y.ObjectAssert.ownsKey('replaceHistory', event);
                },
                endNavigate: function(event) {
                    endCalledAt = Date.now();
                    Y.ObjectAssert.ownsKey('path', event);
                }
            });
            this.app.navigate('/base/regex?foo=events');
            this.wait(function() {
                Y.Assert.isTrue(
                    (startCalledAt > 0) &&
                    (endCalledAt > 0) &&
                    (startCalledAt <= endCalledAt)
                );
            }, 100);
        },

        'should navigate with screen lifecycle': function() {
            var beforeFlip1CalledAt = 0,
                beforeFlip2CalledAt = 0,
                afterFlip2CalledAt = 0,
                afterFlip1CalledAt = 0,
                deactivate1CalledAt = 0,
                LifecycleScreen1 = Y.Base.create('lifecycleScreen1', Y.Screen, [], {
                    beforeFlip: function() {
                        beforeFlip1CalledAt = Date.now();
                    },
                    afterFlip: function() {
                        afterFlip1CalledAt = Date.now();
                    },
                    deactivate: function() {
                        deactivate1CalledAt = Date.now();
                    }
                }, {}),
                LifecycleScreen2 = Y.Base.create('lifecycleScreen2', Y.Screen, [], {
                    beforeFlip: function() {
                        beforeFlip2CalledAt = Date.now();
                    },
                    afterFlip: function() {
                        afterFlip2CalledAt = Date.now();
                    }
                }, {});

            this.app.addScreenRoutes([
                {
                    path: '/lifecycle1',
                    screen: LifecycleScreen1
                },
                {
                    path: '/lifecycle2',
                    screen: LifecycleScreen2
                }
            ]);

            this.app.navigate('/base/lifecycle1');

            setTimeout(function() {
                Y.Assert.isTrue(
                    (beforeFlip1CalledAt > 0) &&
                    (afterFlip1CalledAt > 0) &&
                    (beforeFlip1CalledAt <= afterFlip1CalledAt)
                );
                this.app.navigate('/base/lifecycle2');
            }.bind(this), 100);

            this.wait(function() {
                Y.Assert.isTrue(
                    (beforeFlip2CalledAt > 0) &&
                    (deactivate1CalledAt > 0) &&
                    (afterFlip2CalledAt > 0) &&
                    (beforeFlip2CalledAt <= deactivate1CalledAt) &&
                    (deactivate1CalledAt <= afterFlip2CalledAt)
                );
            }, 200);
        },

        'should navigate to /base/delayed asynchronously': function() {
            this.app.navigate('/base/regex?foo=1');

            setTimeout(function() {
                this.app.navigate('/base/delayed');
            }.bind(this), 100);

            setTimeout(function() {
                this.assertEqualCurrentPath('/base/regex?foo=1');
            }.bind(this), 200);

            this.wait(function() {
                this.assertEqualCurrentPath('/base/delayed');
                this.assertEqualSurfaceContent('body', 'body-delayed');
                this.assertEqualSurfaceContent('header', 'header-delayed');
                Y.Assert.areEqual('Delayed', Y.config.doc.title);
            }, 500);
        },

        'should navigate to /base/page': function() {
            this.app.navigate('/base/page');
            this.wait(function() {
                this.assertEqualCurrentPath('/base/page');
                this.assertEqualSurfaceContent('body', 'body-page');
                this.assertEqualSurfaceContent('header', 'header-page');
                Y.Assert.areEqual('Page', Y.config.doc.title);
            }, 50);
        },

        'should navigate to path with querystring': function() {
            this.app.navigate('/base/regex?foo=1');
            this.wait(function() {
                this.assertEqualCurrentPath('/base/regex?foo=1');
                this.assertEqualSurfaceContent('body', 'body-regex');
                this.assertEqualSurfaceContent('header', 'header-regex');
                Y.Assert.areEqual('Regex', Y.config.doc.title);
            }, 50);
        },

        'should navigate to previous page': function() {
            this.app.navigate('/base/regex?foo=10');

            setTimeout(function() {
                this.app.navigate('/base/regex?foo=20');
            }.bind(this), 100);

            setTimeout(function() {
                Y.config.win.history.back();
            }.bind(this), 200);

            this.wait(function() {
                this.assertEqualCurrentPath('/base/regex?foo=10');
                this.assertEqualSurfaceContent('body', 'body-regex');
                this.assertEqualSurfaceContent('header', 'header-regex');
                Y.Assert.areEqual('Regex', Y.config.doc.title);
            }, 400);
        },

        'should navigate to previous page asynchronously': function() {
            this.app.navigate('/base/delayed');

            setTimeout(function() {
                this.app.navigate('/base/regex?foo=30');
            }.bind(this), 300);

            setTimeout(function() {
                Y.config.win.history.back();
            }.bind(this), 400);

            setTimeout(function() {
                this.assertEqualCurrentPath('/base/delayed');
                this.assertEqualSurfaceContent('body', 'body-regex');
                this.assertEqualSurfaceContent('header', 'header-regex');
                Y.Assert.areEqual('Regex', Y.config.doc.title);
            }.bind(this), 600);

            this.wait(function() {
                this.assertEqualCurrentPath('/base/delayed');
                this.assertEqualSurfaceContent('body', 'body-delayed');
                this.assertEqualSurfaceContent('header', 'header-delayed');
                Y.Assert.areEqual('Delayed', Y.config.doc.title);
            }, 800);
        },

        'should navigate to next page': function() {
            this.app.navigate('/base/regex?foo=40');

            setTimeout(function() {
                this.app.navigate('/base/regex?foo=50');
            }.bind(this), 100);

            setTimeout(function() {
                Y.config.win.history.back();
            }.bind(this), 200);

            setTimeout(function() {
                Y.config.win.history.forward();
            }.bind(this), 400);

            this.wait(function() {
                this.assertEqualCurrentPath('/base/regex?foo=50');
                this.assertEqualSurfaceContent('body', 'body-regex');
                this.assertEqualSurfaceContent('header', 'header-regex');
                Y.Assert.areEqual('Regex', Y.config.doc.title);
            }, 600);
        },

        'should dispatch to the current url': function() {
            Y.config.win.history.pushState(null, '', '/base/regex?foo=1');

            setTimeout(function() {
                this.app.dispatch();
            }.bind(this), 100);

            this.wait(function() {
                this.assertEqualCurrentPath('/base/regex?foo=1');
                this.assertEqualSurfaceContent('body', 'body-regex');
                this.assertEqualSurfaceContent('header', 'header-regex');
                Y.Assert.areEqual('Regex', Y.config.doc.title);
            }, 200);
        },

        'should not handle history states that are not ours': function() {
            Y.config.win.history.pushState({}, '', '/unknown/state');

            setTimeout(function() {
                this.app.navigate('/base/page');
            }.bind(this), 100);

            setTimeout(function() {
                Y.config.win.history.back();
            }.bind(this), 200);

            this.wait(function() {
                this.assertEqualCurrentPath('/unknown/state');
                this.assertEqualSurfaceContent('body', 'body-page');
                this.assertEqualSurfaceContent('header', 'header-page');
                Y.Assert.areEqual('Page', Y.config.doc.title);
            }, 400);
        },

        'should update surfaces and title using HTMLScreen': function() {
            var path = this.getOriginalBasePath() + '/content.txt';

            this.app.set('basePath', this.getOriginalBasePath());
            this.app.addScreenRoutes({
                path: '/content.txt',
                screen: Y.HTMLScreen
            });
            this.app.navigate(path);
            this.wait(function() {
                this.app.set('basePath', '/base');
                this.assertEqualCurrentPath(path);
                this.assertEqualSurfaceContent('body', 'body-html');
                this.assertEqualSurfaceContent('header', 'header-html');
                Y.Assert.areEqual('HTML', Y.config.doc.title);
            }, 100);
        },

        'should update surfaces using HTMLScreen': function() {
            var path = this.getOriginalBasePath() + '/notitle.txt';

            this.app.set('basePath', this.getOriginalBasePath());
            this.app.addScreenRoutes({
                path: '/notitle.txt',
                screen: Y.HTMLScreen
            });
            this.app.navigate(path);
            this.wait(function() {
                this.app.set('basePath', '/base');
                this.assertEqualCurrentPath(path);
                this.assertEqualSurfaceContent('body', 'body-html');
                this.assertEqualSurfaceContent('header', 'header-html');
            }, 100);
        },

        'should navigate fail using HTMLScreen': function() {
            var path = this.getOriginalBasePath() + '/notitle.txt',
                path404 = this.getOriginalBasePath() + '/404.txt';

            this.app.set('basePath', this.getOriginalBasePath());
            this.app.addScreenRoutes({
                path: '/404.txt',
                screen: Y.HTML404Screen
            });
            this.app.navigate(path404);
            this.wait(function() {
                this.app.set('basePath', '/base');
                this.assertEqualCurrentPath(path);
                this.assertEqualSurfaceContent('body', 'body-html');
                this.assertEqualSurfaceContent('header', 'header-html');
            }, 100);
        },

        'should remember the scroll position': function() {
            var pageXOffsetAfterNavigate = 0,
                pageYOffsetAfterNavigate = 0;

            this.app.navigate('/base/regex?foo=60');

            setTimeout(function() {
                Y.config.win.scrollTo(10, 10);
            }.bind(this), 1000);

            setTimeout(function() {
                this.app.navigate('/base/regex?foo=70');
            }.bind(this), 2000);

            setTimeout(function() {
                pageXOffsetAfterNavigate = Y.config.win.pageXOffset;
                pageYOffsetAfterNavigate = Y.config.win.pageYOffset;
                Y.config.win.history.back();
            }.bind(this), 3000);

            this.wait(function() {
                Y.Assert.areEqual(0, pageXOffsetAfterNavigate);
                Y.Assert.areEqual(0, pageYOffsetAfterNavigate);
                Y.Assert.areEqual(10, Y.config.win.pageXOffset);
                Y.Assert.areEqual(10, Y.config.win.pageYOffset);
            }, 10000);
        },

        'should not navigate when navigation cancelled by active screen': function() {
            this.app.navigate('/base/locked');

            setTimeout(function() {
                this.app.navigate('/base/page');
            }.bind(this), 50);

            this.wait(function() {
                this.assertEqualCurrentPath('/base/locked');
                this.assertEqualSurfaceContent('body', 'body-default');
                this.assertEqualSurfaceContent('header', 'header-default');
            }, 100);
        }
    }));

    Y.Test.Runner.add(suite);

}, '', {
    requires: ['test', 'tests-aui-surface-utils', 'node-event-simulate', 'aui-surface']
});
