/* eslint-disable import/no-extraneous-dependencies */
import React from 'react';
import toReact from '@egoist/vue-to-react';
import { addParameters } from '@storybook/vue';
import { DocsPage, DocsContainer } from '@storybook/addon-docs/blocks';
import { extractProps } from './extractProps';
import { extractComponentDescription } from '../../lib/docgenUtils';

addParameters({
  docs: {
    container: DocsContainer,
    page: DocsPage,
    prepareForInline: storyFn => {
      const Story = toReact(storyFn());
      return <Story />;
    },
    extractProps,
    extractComponentDescription,
  },
});
