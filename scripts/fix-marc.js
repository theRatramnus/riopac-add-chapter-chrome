export function fixMarc(item) {
    remapItemType(item);

    fixVolumeInSeries(item);
    return item;
}

function remapItemType(item) {
    if (item.itemType === "thesis") {
        item.itemType = "book";
    }
}

function fixVolumeInSeries(item) { 
    const [series, volume] = item.series?.split(" / ") || [null, null];
    if (series) {
        item.series = series;
    }
    if (volume) {
        item.volume = volume;
    }
}
