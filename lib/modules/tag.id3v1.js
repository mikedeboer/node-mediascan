/*
 * @package node-mediascan
 * @subpackage module
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/node-mediascan/blob/master/LICENSE MIT License
 */

var Fs   = require("fs"),
    Util = require("../core/util");

module.exports = function MediaScan_ID3v1(fd, info, next) {
    var buff = new Buffer(256);
    Fs.read(fd, preid3v1, 0, 256, info.filesize - 256, function(err, bytesRead) {
        if (err)
            return next(err);
        var preid3v1 = buff.slice(0, 128).toString("utf8"),
            id3v1tag = buff.slice(129, 128).toString("utf8");

        if (id3v1tag.substr(0, 3) == "TAG") {
            info["avdataend"] = info["filesize"] - 128;

            var parsed = {};
            parsed["title"]   = MediaScan_ID3v1.cutfield(id3v1tag.substr(3,  30));
            parsed["artist"]  = MediaScan_ID3v1.cutfield(id3v1tag.substr(33, 30));
            parsed["album"]   = MediaScan_ID3v1.cutfield(id3v1tag.substr(63, 30));
            parsed["year"]    = MediaScan_ID3v1.cutfield(id3v1tag.substr(93,  4));
            parsed["comment"] = id3v1tag.substr(97, 30); // can"t remove nulls yet, track detection depends on them
            parsed["genreid"] = id3v1tag.charCodeAt(127);

            // If second-last byte of comment field is null and last byte of comment field is non-null
            // then this is ID3v1.1 and the comment field is 28 bytes long and the 30th byte is the track number
            if ((id3v1tag.charAt(125) === "\x00") && (id3v1tag.charAt(126) !== "\x00")) {
                parsed["track"]   = parsed["comment"].charCodeAt(29);
                parsed["comment"] = parsed["comment"].substr(0, 28);
            }
            parsed["comment"] = MediaScan_ID3v1.cutfield(parsed["comment"]);

            parsed["genre"] = MediaScan_ID3v1.lookupGenreName(parsed["genreid"]);
            if (parsed["genre"])
                delete parsed["genreid"]
            if (!parsed["genre"] || (parsed["genre"] == "Unknown"))
                delete parsed["genre"];

            // FIXME: some odd duplication going on here?
            parsed["comments"] = {};
            for (var key in parsed) {
                if (!parsed["comments"][key])
                    parsed["comments"][key] = [];
                parsed["comments"][key][0] = parsed[key];
            }

            // ID3v1 data is supposed to be padded with NULL characters, but some taggers pad with spaces
            GoodFormatID3v1tag = MediaScan_ID3v1.generateID3v1Tag(
                parsed["title"], parsed["artist"], parsed["album"], parsed["year"],
                (parsed["genre"] ? MediaScan_ID3v1.lookupGenreID(parsed["genre"]) : false),
                parsed["comment"], parsed["track"]);
            parsed["padding_valid"] = true;
            if (id3v1tag !== GoodFormatID3v1tag) {
                parsed["padding_valid"] = false;
                info["warning"].push("Some ID3v1 fields do not use NULL characters for padding");
            }

            parsed["tag_offset_end"]   = info["filesize"];
            parsed["tag_offset_start"] = parsed["tag_offset_end"] - 128;

            info["id3v1"] = parsed;
        }

        if (preid3v1.substr(0, 3) == "TAG") {
            // The way iTunes handles tags is, well, brain-damaged.
            // It completely ignores v1 if ID3v2 is present.
            // This goes as far as adding a new v1 tag *even if there already is one*

            // A suspected double-ID3v1 tag has been detected, but it could be that
            // the "TAG" identifier is a legitimate part of an APE or Lyrics3 tag
            if (preid3v1.substr(96, 8) == "APETAGEX") {
                // an APE tag footer was found before the last ID3v1, assume false "TAG" synch
            }
            else if (preid3v1.substr(119, 6) == "LYRICS") {
                // a Lyrics3 tag footer was found before the last ID3v1, assume false "TAG" synch
            }
            else {
                // APE and Lyrics3 footers not found - assume double ID3v1
                info["warning"].push("Duplicate ID3v1 tag detected - this has been known to happen with iTunes");
                info["avdataend"] -= 128;
            }
        }

        next();
    });
};

MediaScan_ID3v1.cutfield = function(str) {
    return Util.trim(str.substr(0, Util.strcspn(str, "\x00")));
};

// keys 'till index 147:
MediaScan_ID3v1.GENRES = ["Blues", "Classic Rock", "Country", "Dance", "Disco",
    "Funk", "Grunge", "Hip-Hop", "Jazz", "Metal", "New Age", "Oldies", "Other",
    "Pop", "R&B", "Rap", "Reggae", "Rock", "Techno", "Industrial", "Alternative",
    "Ska", "Death Metal", "Pranks", "Soundtrack", "Euro-Techno", "Ambient", "Trip-Hop",
    "Vocal", "Jazz+Funk", "Fusion", "Trance", "Classical", "Instrumental", "Acid",
    "House", "Game", "Sound Clip", "Gospel", "Noise", "Alt. Rock", "Bass", "Soul",
    "Punk", "Space", "Meditative", "Instrumental Pop", "Instrumental Rock", "Ethnic",
    "Gothic", "Darkwave", "Techno-Industrial", "Electronic", "Pop-Folk", "Eurodance",
    "Dream", "Southern Rock", "Comedy", "Cult", "Gangsta Rap", "Top 40", "Christian Rap",
    "Pop/Funk", "Jungle", "Native American", "Cabaret", "New Wave", "Psychedelic",
    "Rave", "Showtunes", "Trailer", "Lo-Fi", "Tribal", "Acid Punk", "Acid Jazz", "Polka",
    "Retro", "Musical", "Rock & Roll", "Hard Rock", "Folk", "Folk/Rock", "National Folk",
    "Swing", "Fast-Fusion", "Bebob", "Latin", "Revival", "Celtic", "Bluegrass",
    "Avantgarde", "Gothic Rock", "Progressive Rock", "Psychedelic Rock", "Symphonic Rock",
    "Slow Rock", "Big Band", "Chorus", "Easy Listening", "Acoustic", "Humour", "Speech",
    "Chanson", "Opera", "Chamber Music", "Sonata", "Symphony", "Booty Bass", "Primus",
    "Porn Groove", "Satire", "Slow Jam", "Club", "Tango", "Samba", "Folklore", "Ballad",
    "Power Ballad", "Rhythmic Soul", "Freestyle", "Duet", "Punk Rock", "Drum Solo",
    "A Cappella", "Euro-House", "Dance Hall", "Goa", "Drum & Bass", "Club-House",
    "Hardcore", "Terror", "Indie", "BritPop", "Negerpunk", "Polsk Punk", "Beat",
    "Christian Gangsta Rap", "Heavy Metal", "Black Metal", "Crossover", "Contemporary Christian",
    "Christian Rock", "Merengue", "Salsa", "Trash Metal", "Anime", "JPop", "Synthpop"];
MediaScan_ID3v1.GENRES[255] = "Unknown";
MediaScan_ID3v1.GENRES["CR"] = "Cover";
MediaScan_ID3v1.GENRES["RX"] = "Remix";

MediaScan_ID3v1.arrayOfGenres = function(allowSCMPXextended) {
    if (allowSCMPXextended && typeof MediaScan_ID3v1.GENRES_SCMPX == "undefined") {
        var genres = MediaScan_ID3v1.GENRES_SCMPX = [].concat(MediaScan_ID3v1.GENRES);
        // http://www.geocities.co.jp/SiliconValley-Oakland/3664/alittle.html#GenreExtended
        // Extended ID3v1 genres invented by SCMPX
        // Note that 255 "Japanese Anime" conflicts with standard "Unknown"
        genres[240] = "Sacred";
        genres[241] = "Northern Europe";
        genres[242] = "Irish & Scottish";
        genres[243] = "Scotland";
        genres[244] = "Ethnic Europe";
        genres[245] = "Enka";
        genres[246] = "Children\"s Song";
        genres[247] = "Japanese Sky";
        genres[248] = "Japanese Heavy Rock";
        genres[249] = "Japanese Doom Rock";
        genres[250] = "Japanese J-POP";
        genres[251] = "Japanese Seiyu";
        genres[252] = "Japanese Ambient Techno";
        genres[253] = "Japanese Moemoe";
        genres[254] = "Japanese Tokusatsu";
        //genres[255] = "Japanese Anime";
    }

    return MediaScan_ID3v1[allowSCMPXextended ? "GENRES_SCMPX" : "GENRES"];
};

MediaScan_ID3v1.lookupGenreName = function(genreid) {
    switch (genreid) {
        case "RX":
        case "CR":
            break;
        default:
            genreid = parseInt(genreid, 10); // to handle 3 or "3" or "03"
            break;
    }
    return MediaScan_ID3v1.arrayOfGenres(true)[genreid] || false;
}

MediaScan_ID3v1.lookupGenreID = function(genre) {
    var genreLookup = MediaScan_ID3v1.arrayOfGenres();
    genre = genre.replace(" ", "").toLowerCase();
    //special cases:
    if (genre == "cover")
        return "CR";
    else if (genre == "remix")
        return "RX";

    for (var value, i = 0, l = genreLookup.length; i < l; ++i) {
        value = genreLookup[i];
        if (typeof value != "string") continue;
        if (value.replace(" ", "").toLowerCase() == genre)
            return i;
    }

    return false;
};

MediaScan_ID3v1.standardiseID3v1GenreName = function(originalGenre) {
    var genreID = MediaScan_ID3v1.lookupGenreID(originalGenre)
    if (genreID !== false)
        return MediaScan_ID3v1.lookupGenreName(GenreID);
    return originalGenre;
};

MediaScan_ID3v1.generateID3v1Tag = function(title, artist, album, year, genreid, comment, track) {
    track = track || "";
    var ID3v1Tag  = "TAG"
        + Util.str_pad(Util.trim(title.substr(0,  30)), 30, "\x00", Util.str_pad_RIGHT)
        + Util.str_pad(Util.trim(artist.substr(0, 30)), 30, "\x00", Util.str_pad_RIGHT)
        + Util.str_pad(Util.trim(album.substr(0,  30)), 30, "\x00", Util.str_pad_RIGHT)
        + Util.str_pad(Util.trim(year.substr(0,    4)),  4, "\x00", Util.str_pad_LEFT);
    if (track && (track > 0) && (track <= 255)) {
        ID3v1Tag += Util.str_pad(Util.trim(comment.substr(0, 28)), 28, "\x00", Util.str_pad_RIGHT)
                  + "\x00";
        if (typeof track == "string")
            track = parseInt(track, 10);
        ID3v1Tag += String.charCodeAt(track);
    }
    else {
        ID3v1Tag += Util.str_pad(Util.trim(comment.substr(0, 30)), 30, "\x00", Util.str_pad_RIGHT);
    }
    if ((genreid < 0) || (genreid > 147))
        genreid = 255; // "unknown" genre
    var t;
    return ID3v1Tag + String.fromCharCode(
        (t = typeof genreid) == "string" || t == "number" ? parseInt(genreid, 10) : 255);
}
