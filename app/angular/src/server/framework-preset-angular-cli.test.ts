import { Configuration } from 'webpack';
import { logger } from '@storybook/node-logger';
import { webpackFinal } from './framework-preset-angular-cli';

// eslint-disable-next-line global-require, jest/no-mocks-import
jest.mock('fs', () => require('../../../../__mocks__/fs'));
jest.spyOn(logger, 'error').mockImplementation();
jest.spyOn(logger, 'info').mockImplementation();

const setupFiles = (files: Record<string, unknown>) => {
  // eslint-disable-next-line no-underscore-dangle, global-require
  require('fs').__setMockFiles(files);
};

const cwd = process.cwd();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('framework-preset-angular-cli', () => {
  describe('without angular.json', () => {
    it('should return webpack base config and display log error', () => {
      const webpackBaseConfig = newWebpackConfiguration();

      const config = webpackFinal(webpackBaseConfig);

      expect(logger.info).toHaveBeenCalledWith('=> Loading angular-cli config.');
      expect(logger.error).toHaveBeenCalledWith(
        `Could not find angular.json using ${cwd}/angular.json`
      );

      expect(config).toEqual(webpackBaseConfig);
    });
  });

  describe("when angular.json haven't projects entry", () => {
    beforeEach(() => {
      setupFiles({ [`${cwd}/angular.json`]: '{}' });
    });
    it('throws error', () => {
      expect(() => webpackFinal(newWebpackConfiguration())).toThrowError(
        'angular.json must have projects entry.'
      );
    });
  });

  describe('when angular.json have empty projects entry', () => {
    beforeEach(() => {
      setupFiles({ [`${cwd}/angular.json`]: '{ "projects": {} }' });
    });
    it('throws error', () => {
      expect(() => webpackFinal(newWebpackConfiguration())).toThrowError(
        'angular.json must have projects entry.'
      );
    });
  });

  describe('when angular.json have projects without architect.build', () => {
    beforeEach(() => {
      setupFiles({
        [`${cwd}/angular.json`]: JSON.stringify({
          projects: { 'foo-project': {} },
          defaultProject: 'foo-project',
        }),
      });
    });

    it('throws error', () => {
      expect(() => webpackFinal(newWebpackConfiguration())).toThrowError(
        "Cannot read property 'build' of undefined"
      );
    });
  });
  describe('when angular.json have projects without architect.build.options.assets', () => {
    beforeEach(() => {
      setupFiles({
        [`${cwd}/angular.json`]: JSON.stringify({
          projects: {
            'foo-project': {
              architect: {
                build: {},
              },
            },
          },
          defaultProject: 'foo-project',
        }),
      });
    });
    it('throws error', () => {
      expect(() => webpackFinal(newWebpackConfiguration())).toThrowError(
        "Cannot read property 'assets' of undefined"
      );
    });
  });
  describe('when angular.json have minimal config', () => {
    beforeEach(() => {
      setupFiles({
        [`${cwd}/angular.json`]: JSON.stringify({
          projects: {
            'foo-project': {
              root: '',
              architect: {
                build: {
                  options: {
                    tsConfig: `${cwd}/src/tsconfig.app.json`,
                    assets: [],
                  },
                },
              },
            },
          },
          defaultProject: 'foo-project',
        }),

        [`${cwd}/src/tsconfig.app.json`]: JSON.stringify({
          extends: 'tsconfig.json',
          compilerOptions: {
            baseUrl: './',
            module: 'es2015',
            types: ['node'],
          },
          exclude: ['karma.ts', '**/*.spec.ts'],
        }),

        [`${cwd}/src/tsconfig.json`]: JSON.stringify({
          compilerOptions: {
            sourceMap: true,
            moduleResolution: 'node',
            emitDecoratorMetadata: true,
            experimentalDecorators: true,
            allowSyntheticDefaultImports: true,
            esModuleInterop: true,
            skipLibCheck: true,
            target: 'es5',
            lib: ['es2017', 'dom'],
          },
        }),
      });
    });
    it('should log', () => {
      const baseWebpackConfig = newWebpackConfiguration();
      webpackFinal(baseWebpackConfig);

      expect(logger.info).toHaveBeenCalledTimes(3);
      expect(logger.info).toHaveBeenNthCalledWith(
        1,
        "=> Using angular project 'foo-project' for configuring Storybook."
      );
      expect(logger.info).toHaveBeenNthCalledWith(2, '=> Loading angular-cli config.');
      expect(logger.info).toHaveBeenNthCalledWith(3, '=> Get angular-cli webpack config.');
    });

    it('should extends webpack base config', () => {
      const baseWebpackConfig = newWebpackConfiguration();
      const webpackFinalConfig = webpackFinal(baseWebpackConfig);

      expect(webpackFinalConfig).toEqual({
        ...baseWebpackConfig,
        module: { ...baseWebpackConfig.module, rules: expect.anything() },
        plugins: expect.anything(),
        resolve: {
          ...baseWebpackConfig.resolve,
          modules: expect.arrayContaining(baseWebpackConfig.resolve.modules),
          // the base resolve.plugins are not kept 🤷‍♂️
          plugins: expect.not.arrayContaining(baseWebpackConfig.resolve.plugins),
        },
        resolveLoader: expect.anything(),
      });
    });

    it('should set webpack "module.rules"', () => {
      const baseWebpackConfig = newWebpackConfiguration();
      const webpackFinalConfig = webpackFinal(baseWebpackConfig);

      expect(webpackFinalConfig.module.rules).toEqual([
        {
          exclude: [],
          test: /\.css$/,
          use: expect.anything(),
        },
        {
          exclude: [],
          test: /\.scss$|\.sass$/,
          use: expect.anything(),
        },
        {
          exclude: [],
          test: /\.less$/,
          use: expect.anything(),
        },
        {
          exclude: [],
          test: /\.styl$/,
          use: expect.anything(),
        },
        ...baseWebpackConfig.module.rules,
      ]);
    });

    it('should set webpack "plugins"', () => {
      const baseWebpackConfig = newWebpackConfiguration();
      const webpackFinalConfig = webpackFinal(baseWebpackConfig);

      expect(webpackFinalConfig.plugins).toMatchInlineSnapshot(`
        Array [
          AnyComponentStyleBudgetChecker {
            "budgets": Array [],
          },
          ContextReplacementPlugin {
            "newContentRecursive": undefined,
            "newContentRegExp": undefined,
            "newContentResource": undefined,
            "resourceRegExp": /\\\\@angular\\(\\\\\\\\\\|\\\\/\\)core\\(\\\\\\\\\\|\\\\/\\)/,
          },
          DedupeModuleResolvePlugin {
            "modules": Map {},
            "options": Object {
              "verbose": undefined,
            },
          },
          Object {
            "keepBasePlugin": true,
          },
        ]
      `);
    });

    it('should set webpack "resolve.modules"', () => {
      const baseWebpackConfig = newWebpackConfiguration();
      const webpackFinalConfig = webpackFinal(baseWebpackConfig);

      expect(webpackFinalConfig.resolve.modules).toEqual([
        ...baseWebpackConfig.resolve.modules,
        `${cwd}/src`,
      ]);
    });

    it('should replace webpack "resolve.plugins"', () => {
      const baseWebpackConfig = newWebpackConfiguration();
      const webpackFinalConfig = webpackFinal(baseWebpackConfig);

      expect(webpackFinalConfig.resolve.plugins).toMatchInlineSnapshot(`
        Array [
          TsconfigPathsPlugin {
            "absoluteBaseUrl": "/Users/tavenier/Perso/storybook/app/angular/src/",
            "baseUrl": "./",
            "extensions": Array [
              ".ts",
              ".tsx",
            ],
            "log": Object {
              "log": [Function],
              "logError": [Function],
              "logInfo": [Function],
              "logWarning": [Function],
            },
            "matchPath": [Function],
            "source": "described-resolve",
            "target": "resolve",
          },
        ]
      `);
    });
  });
  describe('when angular.json have "options.styles" config', () => {
    beforeEach(() => {
      setupFiles({
        [`${cwd}/angular.json`]: JSON.stringify({
          projects: {
            'foo-project': {
              root: '',
              architect: {
                build: {
                  options: {
                    tsConfig: `${cwd}/src/tsconfig.app.json`,
                    styles: ['src/styles.css', 'src/styles.scss'],
                  },
                },
              },
            },
          },
          defaultProject: 'foo-project',
        }),

        [`${cwd}/src/tsconfig.app.json`]: JSON.stringify({
          extends: 'tsconfig.json',
          compilerOptions: {
            baseUrl: './',
            module: 'es2015',
            types: ['node'],
          },
          exclude: ['karma.ts', '**/*.spec.ts'],
        }),

        [`${cwd}/src/tsconfig.json`]: JSON.stringify({
          compilerOptions: {
            sourceMap: true,
            moduleResolution: 'node',
            emitDecoratorMetadata: true,
            experimentalDecorators: true,
            allowSyntheticDefaultImports: true,
            esModuleInterop: true,
            skipLibCheck: true,
            target: 'es5',
            lib: ['es2017', 'dom'],
          },
        }),

        [`${cwd}/src/styles.css`]: '.class {}',
        [`${cwd}/src/styles.scss`]: '.class {}',
      });
    });

    it('should extends webpack base config', () => {
      const baseWebpackConfig = newWebpackConfiguration();
      const webpackFinalConfig = webpackFinal(baseWebpackConfig);

      expect(webpackFinalConfig).toEqual({
        ...baseWebpackConfig,
        entry: [
          ...(baseWebpackConfig.entry as any[]),
          `${cwd}/src/styles.css`,
          `${cwd}/src/styles.scss`,
        ],
        module: { ...baseWebpackConfig.module, rules: expect.anything() },
        plugins: expect.anything(),
        resolve: {
          ...baseWebpackConfig.resolve,
          modules: expect.arrayContaining(baseWebpackConfig.resolve.modules),
          // the base resolve.plugins are not kept 🤷‍♂️
          plugins: expect.not.arrayContaining(baseWebpackConfig.resolve.plugins),
        },
        resolveLoader: expect.anything(),
      });
    });

    it('should set webpack "module.rules"', () => {
      const baseWebpackConfig = newWebpackConfiguration();
      const webpackFinalConfig = webpackFinal(baseWebpackConfig);

      expect(webpackFinalConfig.module.rules).toEqual([
        {
          exclude: [`${cwd}/src/styles.css`, `${cwd}/src/styles.scss`],
          test: /\.css$/,
          use: expect.anything(),
        },
        {
          exclude: [`${cwd}/src/styles.css`, `${cwd}/src/styles.scss`],
          test: /\.scss$|\.sass$/,
          use: expect.anything(),
        },
        {
          exclude: [`${cwd}/src/styles.css`, `${cwd}/src/styles.scss`],
          test: /\.less$/,
          use: expect.anything(),
        },
        {
          exclude: [`${cwd}/src/styles.css`, `${cwd}/src/styles.scss`],
          test: /\.styl$/,
          use: expect.anything(),
        },
        {
          include: [`${cwd}/src/styles.css`, `${cwd}/src/styles.scss`],
          test: /\.css$/,
          use: expect.anything(),
        },
        {
          include: [`${cwd}/src/styles.css`, `${cwd}/src/styles.scss`],
          test: /\.scss$|\.sass$/,
          use: expect.anything(),
        },
        {
          include: [`${cwd}/src/styles.css`, `${cwd}/src/styles.scss`],
          test: /\.less$/,
          use: expect.anything(),
        },
        {
          include: [`${cwd}/src/styles.css`, `${cwd}/src/styles.scss`],
          test: /\.styl$/,
          use: expect.anything(),
        },
        ...baseWebpackConfig.module.rules,
      ]);
    });
  });
});

const newWebpackConfiguration = (
  transformer: (c: Configuration) => Configuration = (c) => c
): Configuration => {
  return transformer({
    name: 'preview',
    mode: 'development',
    bail: false,
    devtool: 'cheap-module-source-map',
    entry: [
      '/Users/joe/storybook/lib/core-server/dist/cjs/globals/polyfills.js',
      '/Users/joe/storybook/lib/core-server/dist/cjs/globals/globals.js',
      '/Users/joe/storybook/examples/angular-cli/.storybook/storybook-init-framework-entry.js',
      '/Users/joe/storybook/addons/docs/dist/esm/frameworks/common/config.js-generated-other-entry.js',
      '/Users/joe/storybook/addons/docs/dist/esm/frameworks/angular/config.js-generated-other-entry.js',
      '/Users/joe/storybook/addons/actions/dist/esm/preset/addDecorator.js-generated-other-entry.js',
      '/Users/joe/storybook/addons/actions/dist/esm/preset/addArgs.js-generated-other-entry.js',
      '/Users/joe/storybook/addons/links/dist/esm/preset/addDecorator.js-generated-other-entry.js',
      '/Users/joe/storybook/addons/knobs/dist/esm/preset/addDecorator.js-generated-other-entry.js',
      '/Users/joe/storybook/addons/backgrounds/dist/esm/preset/addDecorator.js-generated-other-entry.js',
      '/Users/joe/storybook/addons/backgrounds/dist/esm/preset/addParameter.js-generated-other-entry.js',
      '/Users/joe/storybook/addons/a11y/dist/esm/a11yRunner.js-generated-other-entry.js',
      '/Users/joe/storybook/addons/a11y/dist/esm/a11yHighlight.js-generated-other-entry.js',
      '/Users/joe/storybook/examples/angular-cli/.storybook/preview.ts-generated-config-entry.js',
      '/Users/joe/storybook/examples/angular-cli/.storybook/generated-stories-entry.js',
      '/Users/joe/storybook/node_modules/webpack-hot-middleware/client.js?reload=true&quiet=false&noInfo=undefined',
    ],
    output: {
      path: '/Users/joe/storybook/examples/angular-cli/node_modules/.cache/storybook/public',
      filename: '[name].[hash].bundle.js',
      publicPath: '',
    },
    plugins: [{ keepBasePlugin: true } as any],
    module: {
      rules: [{ keepBaseRule: true } as any],
    },
    resolve: {
      extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json', '.cjs'],
      modules: ['node_modules'],
      mainFields: ['browser', 'main'],
      alias: {
        '@emotion/core': '/Users/joe/storybook/node_modules/@emotion/core',
        '@emotion/styled': '/Users/joe/storybook/node_modules/@emotion/styled',
        'emotion-theming': '/Users/joe/storybook/node_modules/emotion-theming',
        '@storybook/addons': '/Users/joe/storybook/lib/addons',
        '@storybook/api': '/Users/joe/storybook/lib/api',
        '@storybook/channels': '/Users/joe/storybook/lib/channels',
        '@storybook/channel-postmessage': '/Users/joe/storybook/lib/channel-postmessage',
        '@storybook/components': '/Users/joe/storybook/lib/components',
        '@storybook/core-events': '/Users/joe/storybook/lib/core-events',
        '@storybook/router': '/Users/joe/storybook/lib/router',
        '@storybook/theming': '/Users/joe/storybook/lib/theming',
        '@storybook/semver': '/Users/joe/storybook/node_modules/@storybook/semver',
        '@storybook/client-api': '/Users/joe/storybook/lib/client-api',
        '@storybook/client-logger': '/Users/joe/storybook/lib/client-logger',
        react: '/Users/joe/storybook/node_modules/react',
        'react-dom': '/Users/joe/storybook/node_modules/react-dom',
      },
      plugins: [{ keepBasePlugin: true } as any],
    },
    resolveLoader: { plugins: [] },
    optimization: {
      splitChunks: { chunks: 'all' },
      runtimeChunk: true,
      sideEffects: true,
      usedExports: true,
      concatenateModules: true,
      minimizer: [],
    },
    performance: { hints: false },
  });
};
