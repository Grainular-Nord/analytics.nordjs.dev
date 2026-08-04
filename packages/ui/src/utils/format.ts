export const formatViews = (value: number) =>
    value >= 10_000 ? `${(value / 1000).toFixed(1)}k` : value.toLocaleString();
