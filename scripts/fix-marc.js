import {findContent} from "./content.js";

export function fixMarc(item, xml) {
    remapItemType(item);

    fixVolumeInSeries(item);

    fixAuthors(item, xml);
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

function fixAuthors(item, xml) {

    let areEditors = false;
    try {
        areEditors = findContent(xml, "700", "e") === "Hrsg.";
    } catch (error) {
        console.log("field 700e does not exist, assuming no editors");
    }

    let creatorXML = findContent(xml, "700", "a");

    if (creatorXML === "") { creatorXML = findContent(xml, "100", "a"); }



    const creators = creatorXML.split(";").map(name => {
        const [lastName, firstName] = name.split(",").map(s => s.trim());
        return {
            creatorType: areEditors ? "editor" : "author",
            firstName: firstName || "",
            lastName: lastName || ""
        };
    });



    if (creators) {
        item.creators = creators;
    }
}
