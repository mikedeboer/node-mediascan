/*
 * @package node-mediascan
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/node-mediascan/blob/master/LICENSE MIT License
 */

/**
 * Extends an object with one or more other objects by copying all their
 * properties.
 * @param {Object} dest the destination object.
 * @param {Object} src the object that is copies from.
 * @return {Object} the destination object.
 */
exports.extend = function(dest, src){
    var prop, i, x = !dest.notNull;
    if (arguments.length == 2) {
        for (prop in src) {
            if (x || src[prop])
                dest[prop] = src[prop];
        }
        return dest;
    }

    for (i = 1; i < arguments.length; i++) {
        src = arguments[i];
        for (prop in src) {
            if (x || src[prop])
                dest[prop] = src[prop];
        }
    }
    return dest;
};

/**
 * Main used to check if 'err' is undefined or null
 *
 * @param  {mixed} obj
 * @return {Boolean}
 */
exports.empty = function(obj) {
    if (arguments.length === 1)
        return obj === undefined || obj === null || obj === "" || obj === false;
    // support multiple arguments that shortens:
    // Util.empty('foo') && Util.empty('bar') to Util.empty('foo', 'bar')
    for (var empty = true, i = 0, l = arguments.length; i < l && empty; ++i) {
        obj   = arguments[i];
        empty = (obj === undefined || obj === null || obj === "" || obj === false);
    }
    return empty;
};

exports.trim = function(str, charlist) {
    // Strips whitespace from the beginning and end of a string
    var whitespace, l = 0, i = 0;
    str += "";

    if (!charlist) {
        // default list
        whitespace = " \n\r\t\f\x0b\xa0\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u200b\u2028\u2029\u3000";
    } else {
        // preg_quote custom list
        charlist += "";
        whitespace = charlist.replace(/([\[\]\(\)\.\?\/\*\{\}\+\$\^\:])/g, "$1");
    }

    l = str.length;
    for (i = 0; i < l; i++) {
        if (whitespace.indexOf(str.charAt(i)) === -1) {
            str = str.substring(i);
            break;
        }
    }

    l = str.length;
    for (i = l - 1; i >= 0; i--) {
        if (whitespace.indexOf(str.charAt(i)) === -1) {
            str = str.substring(0, i + 1);
            break;
        }
    }

    return whitespace.indexOf(str.charAt(0)) === -1 ? str : "";
};

exports.str_pad = function(input, pad_length, pad_string, pad_type) {
    // http://kevin.vanzonneveld.net
    // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // + namespaced by: Michael White (http://getsprink.com)
    // +      input by: Marco van Oort
    // +   bugfixed by: Brett Zamir (http://brett-zamir.me)
    // *     example 1: str_pad("Kevin van Zonneveld", 30, "-=", "STR_PAD_LEFT");
    // *     returns 1: "-=-=-=-=-=-Kevin van Zonneveld"
    // *     example 2: str_pad("Kevin van Zonneveld", 30, "-", "STR_PAD_BOTH");
    // *     returns 2: "------Kevin van Zonneveld-----"
    var half = "", pad_to_go;

    var str_pad_repeater = function (s, len) {
        var collect = "", i;

        while (collect.length < len) {collect += s;}
        collect = collect.substr(0,len);

        return collect;
    };

    input += "";
    pad_string = pad_string !== undefined ? pad_string : " ";

    if (pad_type != "STR_PAD_LEFT" && pad_type != "STR_PAD_RIGHT" && pad_type != "STR_PAD_BOTH") { pad_type = "STR_PAD_RIGHT"; }
    if ((pad_to_go = pad_length - input.length) > 0) {
        if (pad_type == "STR_PAD_LEFT") { input = str_pad_repeater(pad_string, pad_to_go) + input; }
        else if (pad_type == "STR_PAD_RIGHT") { input = input + str_pad_repeater(pad_string, pad_to_go); }
        else if (pad_type == "STR_PAD_BOTH") {
            half = str_pad_repeater(pad_string, Math.ceil(pad_to_go/2));
            input = half + input + half;
            input = input.substr(0, pad_length);
        }
    }

    return input;
};

exports.strcspn = function(str, mask, start, length) {
    // http://kevin.vanzonneveld.net
    // +   original by: Brett Zamir (http://brett-zamir.me)
    // *     example 1: strcspn('abcdefg123', '1234567890');
    // *     returns 1: 7
    // *     example 2: strcspn('123abc', '1234567890');
    // *     returns 2: 3

    start = start ? start : 0;
    var count = (length && ((start + length) < str.length)) ? start + length : str.length;
    strct:
    for (var i=start, lgth=0; i < count; i++) {
        for (var j=0; j < mask.length; j++) {
            if (str.charAt(i).indexOf(mask[j]) !== -1) {
                continue strct;
            }
        }
        ++lgth;
    }

    return lgth;
};

exports.FormatList = {
    // Audio formats

    // AC-3   - audio      - Dolby AC-3 / Dolby Digital
    "ac3"  : {
        "pattern"   : "^\x0B\x77",
        "group"     : "audio",
        "module"    : "ac3",
        "mime_type" : "audio/ac3"
    },

    // AAC  - audio       - Advanced Audio Coding (AAC) - ADIF format
    "adif" : {
        "pattern"   : "^ADIF",
        "group"     : "audio",
        "module"    : "aac",
        "option"    : "adif",
        "mime_type" : "application/octet-stream",
        "fail_ape"  : "WARNING"
    },


    // AA   - audio       - Audible Audiobook
    "adts" : {
        "pattern"   : "^.{4}\x57\x90\x75\x36",
        "group"     : "audio",
        "module"    : "aa",
        "mime_type" : "audio/audible "
    },

    // AAC  - audio       - Advanced Audio Coding (AAC) - ADTS format (very similar to MP3)
    "adts" : {
        "pattern"   : "^\xFF[\xF0-\xF1\xF8-\xF9]",
        "group"     : "audio",
        "module"    : "aac",
        "option"    : "adts",
        "mime_type" : "application/octet-stream",
        "fail_ape"  : "WARNING"
    },


    // AU   - audio       - NeXT/Sun AUdio (AU)
    "au"   : {
        "pattern"   : "^\.snd",
        "group"     : "audio",
        "module"    : "au",
        "mime_type" : "audio/basic"
    },

    // AVR  - audio       - Audio Visual Research
    "avr"  : {
        "pattern"   : "^2BIT",
        "group"     : "audio",
        "module"    : "avr",
        "mime_type" : "application/octet-stream"
    },

    // BONK - audio       - Bonk v0.9+
    "bonk" : {
        "pattern"   : "^\x00(BONK|INFO|META| ID3)",
        "group"     : "audio",
        "module"    : "bonk",
        "mime_type" : "audio/xmms-bonk"
    },

    // DSS  - audio       - Digital Speech Standard
    "dss"  : {
        "pattern"   : "^[\x02]dss",
        "group"     : "audio",
        "module"    : "dss",
        "mime_type" : "application/octet-stream"
    },

    // DTS  - audio       - Dolby Theatre System
    "dts"  : {
        "pattern"   : "^\x7F\xFE\x80\x01",
        "group"     : "audio",
        "module"    : "dts",
        "mime_type" : "audio/dts"
    },

    // FLAC - audio       - Free Lossless Audio Codec
    "flac" : {
        "pattern"   : "^fLaC",
        "group"     : "audio",
        "module"    : "flac",
        "mime_type" : "audio/x-flac"
    },

    // LA   - audio       - Lossless Audio (LA)
    "la"   : {
        "pattern"   : "^LA0[2-4]",
        "group"     : "audio",
        "module"    : "la",
        "mime_type" : "application/octet-stream"
    },

    // LPAC - audio       - Lossless Predictive Audio Compression (LPAC)
    "lpac" : {
        "pattern"   : "^LPAC",
        "group"     : "audio",
        "module"    : "lpac",
        "mime_type" : "application/octet-stream"
    },

    // MIDI - audio       - MIDI (Musical Instrument Digital Interface)
    "midi" : {
        "pattern"   : "^MThd",
        "group"     : "audio",
        "module"    : "midi",
        "mime_type" : "audio/midi"
    },

    // MAC  - audio       - Monkey"s Audio Compressor
    "mac"  : {
        "pattern"   : "^MAC ",
        "group"     : "audio",
        "module"    : "monkey",
        "mime_type" : "application/octet-stream"
    },

// has been known to produce false matches in random files (e.g. JPEGs}, leave out until more precise matching available
//              // MOD  - audio       - MODule (assorted sub-formats)
//              "mod"  : {
//                          "pattern"   : "^.{1080}(M\\.K\\.|M!K!|FLT4|FLT8|[5-9]CHN|[1-3][0-9]CH)",
//                          "group"     : "audio",
//                          "module"    : "mod",
//                          "option"    : "mod",
//                          "mime_type" : "audio/mod",
//                      },

    // MOD  - audio       - MODule (Impulse Tracker)
    "it"   : {
        "pattern"   : "^IMPM",
        "group"     : "audio",
        "module"    : "mod",
        "option"    : "it",
        "mime_type" : "audio/it"
    },

    // MOD  - audio       - MODule (eXtended Module, various sub-formats)
    "xm"   : {
        "pattern"   : "^Extended Module",
        "group"     : "audio",
        "module"    : "mod",
        "option"    : "xm",
        "mime_type" : "audio/xm"
    },

    // MOD  - audio       - MODule (ScreamTracker)
    "s3m"  : {
        "pattern"   : "^.{44}SCRM",
        "group"     : "audio",
        "module"    : "mod",
        "option"    : "s3m",
        "mime_type" : "audio/s3m"
    },

    // MPC  - audio       - Musepack / MPEGplus
    "mpc"  : {
        "pattern"   : "^(MPCK|MP\+|[\x00\x01\x10\x11\x40\x41\x50\x51\x80\x81\x90\x91\xC0\xC1\xD0\xD1][\x20-37][\x00\x20\x40\x60\x80\xA0\xC0\xE0])",
        "group"     : "audio",
        "module"    : "mpc",
        "mime_type" : "audio/x-musepack"
    },

    // MP3  - audio       - MPEG-audio Layer 3 (very similar to AAC-ADTS)
    "mp3"  : {
        "pattern"   : "^\xFF[\xE2-\xE7\xF2-\xF7\xFA-\xFF][\x00-\xEB]",
        "group"     : "audio",
        "module"    : "mp3",
        "mime_type" : "audio/mpeg"
    },

    // OFR  - audio       - OptimFROG
    "ofr"  : {
        "pattern"   : "^(\*RIFF|OFR)",
        "group"     : "audio",
        "module"    : "optimfrog",
        "mime_type" : "application/octet-stream"
    },

    // RKAU - audio       - RKive AUdio compressor
    "rkau" : {
        "pattern"   : "^RKA",
        "group"     : "audio",
        "module"    : "rkau",
        "mime_type" : "application/octet-stream"
    },

    // SHN  - audio       - Shorten
    "shn"  : {
        "pattern"   : "^ajkg",
        "group"     : "audio",
        "module"    : "shorten",
        "mime_type" : "audio/xmms-shn",
        "fail_id3"  : "ERROR",
        "fail_ape"  : "ERROR"
    },

    // TTA  - audio       - TTA Lossless Audio Compressor (http://tta.corecodec.org)
    "tta"  : {
        "pattern"   : "^TTA",  // could also be "^TTA(\x01|\x02|\x03|2|1)"
        "group"     : "audio",
        "module"    : "tta",
        "mime_type" : "application/octet-stream"
    },

    // VOC  - audio       - Creative Voice (VOC)
    "voc"  : {
        "pattern"   : "^Creative Voice File",
        "group"     : "audio",
        "module"    : "voc",
        "mime_type" : "audio/voc"
    },

    // VQF  - audio       - transform-domain weighted interleave Vector Quantization Format (VQF)
    "vqf"  : {
        "pattern"   : "^TWIN",
        "group"     : "audio",
        "module"    : "vqf",
        "mime_type" : "application/octet-stream"
    },

    // WV  - audio        - WavPack (v4.0+)
    "wv"   : {
        "pattern"   : "^wvpk",
        "group"     : "audio",
        "module"    : "wavpack",
        "mime_type" : "application/octet-stream"
    },


    // Audio-Video formats

    // ASF  - audio/video - Advanced Streaming Format, Windows Media Video, Windows Media Audio
    "asf"  : {
        "pattern"   : "^\x30\x26\xB2\x75\x8E\x66\xCF\x11\xA6\xD9\x00\xAA\x00\x62\xCE\x6C",
        "group"     : "audio-video",
        "module"    : "asf",
        "mime_type" : "video/x-ms-asf",
        "iconv_req" : false
    },

    // BINK - audio/video - Bink / Smacker
    "bink" : {
        "pattern"   : "^(BIK|SMK)",
        "group"     : "audio-video",
        "module"    : "bink",
        "mime_type" : "application/octet-stream"
    },

    // FLV  - audio/video - FLash Video
    "flv" : {
        "pattern"   : "^FLV\x01",
        "group"     : "audio-video",
        "module"    : "flv",
        "mime_type" : "video/x-flv"
    },

    // MKAV - audio/video - Mastroka
    "matroska" : {
        "pattern"   : "^\x1A\x45\xDF\xA3",
        "group"     : "audio-video",
        "module"    : "matroska",
        "mime_type" : "video/x-matroska" // may also be audio/x-matroska
    },

    // MPEG - audio/video - MPEG (Moving Pictures Experts Group)
    "mpeg" : {
        "pattern"   : "^\x00\x00\x01(\xBA|\xB3)",
        "group"     : "audio-video",
        "module"    : "mpeg",
        "mime_type" : "video/mpeg"
    },

    // NSV  - audio/video - Nullsoft Streaming Video (NSV)
    "nsv"  : {
        "pattern"   : "^NSV[sf]",
        "group"     : "audio-video",
        "module"    : "nsv",
        "mime_type" : "application/octet-stream"
    },

    // Ogg  - audio/video - Ogg (Ogg-Vorbis, Ogg-FLAC, Speex, Ogg-Theora(*}, Ogg-Tarkin(*))
    "ogg"  : {
        "pattern"   : "^OggS",
        "group"     : "audio",
        "module"    : "ogg",
        "mime_type" : "application/ogg",
        "fail_id3"  : "WARNING",
        "fail_ape"  : "WARNING"
    },

    // QT   - audio/video - Quicktime
    "quicktime" : {
        "pattern"   : "^.{4}(cmov|free|ftyp|mdat|moov|pnot|skip|wide)",
        "group"     : "audio-video",
        "module"    : "quicktime",
        "mime_type" : "video/quicktime"
    },

    // RIFF - audio/video - Resource Interchange File Format (RIFF) / WAV / AVI / CD-audio / SDSS = renamed variant used by SmartSound QuickTracks (www.smartsound.com) / FORM = Audio Interchange File Format (AIFF)
    "riff" : {
        "pattern"   : "^(RIFF|SDSS|FORM)",
        "group"     : "audio-video",
        "module"    : "riff",
        "mime_type" : "audio/x-wave",
        "fail_ape"  : "WARNING"
    },

    // Real - audio/video - RealAudio, RealVideo
    "real" : {
        "pattern"   : "^(\\.RMF|\\.ra)",
        "group"     : "audio-video",
        "module"    : "real",
        "mime_type" : "audio/x-realaudio"
    },

    // SWF - audio/video - ShockWave Flash
    "swf" : {
        "pattern"   : "^(F|C)WS",
        "group"     : "audio-video",
        "module"    : "swf",
        "mime_type" : "application/x-shockwave-flash"
    },


    // Still-Image formats

    // BMP  - still image - Bitmap (Windows, OS/2; uncompressed, RLE8, RLE4)
    "bmp"  : {
        "pattern"   : "^BM",
        "group"     : "graphic",
        "module"    : "bmp",
        "mime_type" : "image/bmp",
        "fail_id3"  : "ERROR",
        "fail_ape"  : "ERROR"
    },

    // GIF  - still image - Graphics Interchange Format
    "gif"  : {
        "pattern"   : "^GIF",
        "group"     : "graphic",
        "module"    : "gif",
        "mime_type" : "image/gif",
        "fail_id3"  : "ERROR",
        "fail_ape"  : "ERROR"
    },

    // JPEG - still image - Joint Photographic Experts Group (JPEG)
    "jpg"  : {
        "pattern"   : "^\xFF\xD8\xFF",
        "group"     : "graphic",
        "module"    : "jpg",
        "mime_type" : "image/jpeg",
        "fail_id3"  : "ERROR",
        "fail_ape"  : "ERROR"
    },

    // PCD  - still image - Kodak Photo CD
    "pcd"  : {
        "pattern"   : "^.{2048}PCD_IPI\x00",
        "group"     : "graphic",
        "module"    : "pcd",
        "mime_type" : "image/x-photo-cd",
        "fail_id3"  : "ERROR",
        "fail_ape"  : "ERROR"
    },


    // PNG  - still image - Portable Network Graphics (PNG)
    "png"  : {
        "pattern"   : "^\x89\x50\x4E\x47\x0D\x0A\x1A\x0A",
        "group"     : "graphic",
        "module"    : "png",
        "mime_type" : "image/png",
        "fail_id3"  : "ERROR",
        "fail_ape"  : "ERROR"
    },


    // SVG  - still image - Scalable Vector Graphics (SVG)
    "svg"  : {
        "pattern"   : "(<!DOCTYPE svg PUBLIC |xmlns=\"http:\/\/www\.w3\.org\/2000\/svg\")",
        "group"     : "graphic",
        "module"    : "svg",
        "mime_type" : "image/svg+xml",
        "fail_id3"  : "ERROR",
        "fail_ape"  : "ERROR"
    },


    // TIFF  - still image - Tagged Information File Format (TIFF)
    "tiff" : {
        "pattern"   : "^(II\x2A\x00|MM\x00\x2A)",
        "group"     : "graphic",
        "module"    : "tiff",
        "mime_type" : "image/tiff",
        "fail_id3"  : "ERROR",
        "fail_ape"  : "ERROR"
    },


    // Data formats

    // ISO  - data        - International Standards Organization (ISO) CD-ROM Image
    "iso"  : {
        "pattern"   : "^.{32769}CD001",
        "group"     : "misc",
        "module"    : "iso",
        "mime_type" : "application/octet-stream",
        "fail_id3"  : "ERROR",
        "fail_ape"  : "ERROR",
        "iconv_req" : false
    },

    // RAR  - data        - RAR compressed data
    "rar"  : {
        "pattern"   : "^Rar\!",
        "group"     : "archive",
        "module"    : "rar",
        "mime_type" : "application/octet-stream",
        "fail_id3"  : "ERROR",
        "fail_ape"  : "ERROR"
    },

    // SZIP - audio/data  - SZIP compressed data
    "szip" : {
        "pattern"   : "^SZ\x0A\x04",
        "group"     : "archive",
        "module"    : "szip",
        "mime_type" : "application/octet-stream",
        "fail_id3"  : "ERROR",
        "fail_ape"  : "ERROR"
    },

    // TAR  - data        - TAR compressed data
    "tar"  : {
        "pattern"   : "^.{100}[0-9\x20]{7}\x00[0-9\x20]{7}\x00[0-9\x20]{7}\x00[0-9\x20\x00]{12}[0-9\x20\x00]{12}",
        "group"     : "archive",
        "module"    : "tar",
        "mime_type" : "application/x-tar",
        "fail_id3"  : "ERROR",
        "fail_ape"  : "ERROR"
    },

    // GZIP  - data        - GZIP compressed data
    "gz"  : {
        "pattern"   : "^\x1F\x8B\x08",
        "group"     : "archive",
        "module"    : "gzip",
        "mime_type" : "application/x-gzip",
        "fail_id3"  : "ERROR",
        "fail_ape"  : "ERROR"
    },

    // ZIP  - data         - ZIP compressed data
    "zip"  : {
        "pattern"   : "^PK\x03\x04",
        "group"     : "archive",
        "module"    : "zip",
        "mime_type" : "application/zip",
        "fail_id3"  : "ERROR",
        "fail_ape"  : "ERROR"
    },


    // Misc other formats

    // PAR2 - data        - Parity Volume Set Specification 2.0
    "par2" : {
        "pattern"   : "^PAR2\x00PKT",
        "group"     : "misc",
        "module"    : "par2",
        "mime_type" : "application/octet-stream",
        "fail_id3"  : "ERROR",
        "fail_ape"  : "ERROR"
    },

    // PDF  - data        - Portable Document Format
    "pdf"  : {
        "pattern"   : "^\x25PDF",
        "group"     : "misc",
        "module"    : "pdf",
        "mime_type" : "application/pdf",
        "fail_id3"  : "ERROR",
        "fail_ape"  : "ERROR"
    },

    // MSOFFICE  - data   - ZIP compressed data
    "msoffice" : {
        "pattern"   : "^\xD0\xCF\x11\xE0", // D0CF11E == DOCFILE == Microsoft Office Document
        "group"     : "misc",
        "module"    : "msoffice",
        "mime_type" : "application/octet-stream",
        "fail_id3"  : "ERROR",
        "fail_ape"  : "ERROR"
    },

     // CUE  - data       - CUEsheet (index to single-file disc images)
     "cue" : {
        "pattern"   : "", // empty pattern means cannot be automatically detected, will fall through all other formats and match based on filename and very basic file contents
        "group"     : "misc",
        "module"    : "cue",
        "mime_type" : "application/octet-stream"
     }
};