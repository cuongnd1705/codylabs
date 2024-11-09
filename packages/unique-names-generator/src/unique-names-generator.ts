import { Config, UniqueNamesGeneratorHandler } from './unique-names-generator.handler';

const defaultConfig: Config = {
  separator: '_',
  dictionaries: [],
};

export const uniqueNamesGenerator = (customConfig: Config): string => {
  const dictionaries = [...(customConfig?.dictionaries || defaultConfig.dictionaries)];

  const config: Config = {
    ...defaultConfig,
    ...customConfig,
    length: customConfig?.length || dictionaries.length,
    dictionaries,
  };

  if (!customConfig || !customConfig.dictionaries || !customConfig.dictionaries.length) {
    throw new Error(`A "dictionaries" array must be provided.`);
  }

  const uniqueNamesGeneratorHandler = new UniqueNamesGeneratorHandler(config);

  return uniqueNamesGeneratorHandler.generate();
};
