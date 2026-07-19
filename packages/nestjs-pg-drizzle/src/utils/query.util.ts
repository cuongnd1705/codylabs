export function withSoftDeleteFilter<T extends { where?: unknown }>(config: T, enabled: boolean): T {
  if (!enabled) {
    return config;
  }

  const softDeleteFilter = {
    deleteTime: {
      isNull: true,
    },
  };

  return {
    ...config,
    where: config.where
      ? {
          AND: [config.where, softDeleteFilter],
        }
      : softDeleteFilter,
  } as T;
}
