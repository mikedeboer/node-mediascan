/*
 * @package node-mediascan
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/node-mediascan/blob/master/LICENSE MIT License
 */

var Fs    = require("fs"),
    Path  = require("path"),
    Util  = require("./util"),
    Async = require("../support/async.js/lib/async");

module.exports = function MediaScan(options) {
    this.options = Util.extend(Util.extend({}, MediaScan.DEFAULT_OPTIONS), options || {});

    this.check();
};

MediaScan.DEFAULT_OPTIONS = {
    //Examples:  ISO-8859-1  UTF-8  UTF-16  UTF-16BE
    encoding: "ISO-8859-1",
    // Should always be 'ISO-8859-1', but some tags may be written in other encodings such as 'EUC-CN'
    encoding_id3v1: "ISO-8859-1",
    // default '*' should use system temp dir
    tempdir: "*",

    // public: Optional tag checks - disable for speed.
    // Read and process ID3v1 tags
    tag_id3v1         : true,
    // Read and process ID3v2 tags
    tag_id3v2         : true,
    // Read and process Lyrics3 tags
    tag_lyrics3       : true,
    // Read and process APE tags
    tag_apetag        : true,
    // Copy tags to root key 'tags' and encode to options.encoding
    tags_process      : true,
    // Copy tags to root key 'tags_html' properly translated from various encodings to HTML entities
    tags_html         : true,

    // public: Optional tag/comment calucations
    // Calculate additional info such as bitrate, channelmode etc
    extra_info        : true,

    // public: Optional calculations
    // Get MD5 sum of data part - slow
    md5_data          : false,
    // Use MD5 of source file if availble - only FLAC and OptimFROG
    md5_data_source   : false,
    // Get SHA1 sum of data part - slow
    sha1_data         : false,
    // Check whether file is larger than 2 Gb and thus not supported by PHP
    max_2gb_check     : true
};

MediaScan.DEFAULT_TMPDIR = (function() {
    var value,
        def     = "/tmp",
        envVars = ["TMPDIR", "TMP", "TEMP"],
        i       = 0,
        l       = envVars.length;
    for(; i < l; ++i) {
        value = process.env[envVars[i]];
        if (value)
            return Fs.realpathSync(value);
    }
    return Fs.realpathSync(def);
})();

MediaScan.TAGS = {
    "asf"       : ["asf"           , "UTF-16LE"],
    "midi"      : ["midi"          , "ISO-8859-1"],
    "nsv"       : ["nsv"           , "ISO-8859-1"],
    "ogg"       : ["vorbiscomment" , "UTF-8"],
    "png"       : ["png"           , "UTF-8"],
    "tiff"      : ["tiff"          , "ISO-8859-1"],
    "quicktime" : ["quicktime"     , "ISO-8859-1"],
    "real"      : ["real"          , "ISO-8859-1"],
    "vqf"       : ["vqf"           , "ISO-8859-1"],
    "zip"       : ["zip"           , "ISO-8859-1"],
    "riff"      : ["riff"          , "ISO-8859-1"],
    "lyrics3"   : ["lyrics3"       , "ISO-8859-1"],
    "id3v1"     : ["id3v1"         , "ISO-8859-1"],
    // not according to the specs (every frame can have a different encoding],
    // but MediaScan force-converts all encodings to UTF-8
    "id3v2"     : ["id3v2"         , "UTF-8"],
    "ape"       : ["ape"           , "UTF-8"],
    "cue"       : ["cue"           , "ISO-8859-1"]
};

(function() {
    this.check = function() {
        if (this.options.tmpdir == "*")
            this.options.tmpdir = MediaScan.DEFAULT_TMPDIR;

        //TODO: windows support coming later...
    };

    this.analyze = function(filename, callback) {
        // remote files not supported
        if (/^(ht|f)tp:\/\//.test(filename)) {
            return callback("Remote files are not supported in this version of "
                + "MediaScan - please copy the file locally first");
        }
        
        var info    = {},
            options = this.options,
            _self   = this;

        Fs.stat(filename, function(err, stat) {
            if (err)
                return callback(err);
            if (!stat.isFile())
                return callback("Filename provided is not a file.");

            info.filesize = stat.size;
            Fs.open(filename, "r", 0666, function(err, fd) {
                if (err)
                    return callback(err);
                // set more parameters
                info["avdataoffset"] = 0;
                info["avdataend"]    = info["filesize"];
                // filled in later
                info["fileformat"]   = "";
                // filled in later, unset if not used
                info["audio"]        = {"dataformat": ""};
                // filled in later, unset if not used
                info["video"]        = {"dataformat": ""};
                // filled in later, unset if not used
                info["tags"]         = {};
                // filled in later, unset if not used
                info["error"]        = [];
                // filled in later, unset if not used
                info["warning"]      = [];
                // filled in later, unset if not used
                info["comments"]     = {};
                // required by id3v2 and iso modules - can be unset at the end if desired
                info["encoding"]     = options.encoding;

                // set redundant parameters - might be needed in some include file
                info["filename"]     = Path.basename(filename);
                info["filepath"]     = Path.normalize(Path.dirname(filename));
                info["filenamepath"] = info["filepath"] + "/" + info["filename"];

                if (options.tag_id3v2) {
                    var ID3v2 = require("../modules/tag.id3v2");
                    ID3v2(fd, info, handleTag);
                }
                else {
                    var header = new Buffer();
                    Fs.read(fd, header, 0, 10, 0, function(err, bytesRead) {
                        if (err)
                            return callback(err);
                        header = header.toString("utf8"); //FIXME: ASCII will be faster, can we use it here?
                        if (header.substr(0, 3) == "ID3" && header.length == 10) {
                            info["id3v2"] = {
                                header: true,
                                majorversion: header.charCodeAt(3),
                                minorversion: header.charCodeAt(4),
                                tag_offset_start: 0
                            };
                            // length of ID3v2 tag in 10-byte header doesn"t include 10-byte header length
                            info["id3v2"]["headerlength"]   = Util.bigEndian2Int(header.substr(6, 4), 1) + 10;
                            info["id3v2"]["tag_offset_end"] = info["id3v2"]["tag_offset_start"]
                                                            + info["id3v2"]["headerlength"];
                            info["avdataoffset"]            = info["id3v2"]["tag_offset_end"];
                        }
                        handleTag();
                    });
                }

                function handleTag() {
                    Async.list(["id3v1", "apetag", "lyrics3"])
                      .each(function(tag, next) {
                          var TagCls = require("../modules/tag." + tag);
                          TagCls(fd, info, next);
                      })
                      .end(function(err) {
                          // read 32 kb file data
                          var formattest = new Buffer();
                          Fs.read(fd, 0, 32774, info["avdataoffset"], function(err, bytesRead) {
                              // determine format
                              var determined_format = _self.getFileFormat(formattest.toString("utf8"), filename);
                              // unable to determine file format
                              if (!determined_format) {
                                  Fs.closeSync(fd);
                                  return callback("unable to determine file format");
                              }

                              // check for illegal ID3 tags
                              if (determined_format["fail_id3"] && (info["tags"]["id3v1"] || info["tags"]["id3v2"])) {
                                  if (determined_format["fail_id3"] === "ERROR") {
                                      Fs.closeSync(fd);
                                      return callback("ID3 tags not allowed on this file type.");
                                  }
                                  else if (determined_format["fail_id3"] == "WARNING") {
                                      info["warning"].push("ID3 tags not allowed on this file type.");
                                  }
                              }

                              // check for illegal APE tags
                              if (determined_format["fail_ape"] && info["tags"]["ape"]) {
                                  if (determined_format["fail_ape"] === "ERROR") {
                                      Fs.closeSync(fd);
                                      return callback("APE tags not allowed on this file type.");
                                  }
                                  else if (determined_format["fail_ape"] == "WARNING") {
                                      info["warning"].push("APE tags not allowed on this file type.");
                                  }
                              }

                              // set mime type
                              info["mime_type"] = determined_format["mime_type"];

                              // include module
                              var Module = require("../module/" + determined_format["include"]);
                              if (!Module) {
                                  return callback("Format not supported, module '"
                                      + determined_format["include"] + "' is corrupt.");
                              }
                              Module(fd, info, determined_format["option"], function(err) {
                                  if (err)
                                      return callback(err);
                                  // close file
                                  Fs.close(fd, function(err) {
                                      if (err)
                                          return callback(err);
                                      // process all tags - copy to 'tags' and convert charsets
                                      if (options.tags_process)
                                          _self.handleAllTags();

                                      // perform more calculations
                                      if (options.extra_info) {
                                          _self.channelsBitratePlaytimeCalculations();
                                          _self.calculateCompressionRatioVideo();
                                          _self.calculateCompressionRatioAudio();
                                          _self.calculateReplayGain();
                                          _self.processAudioStreams();
                                      }

                                      // get the MD5 sum of the audio/video portion
                                      // of the file - without ID3/APE/Lyrics3/etc
                                      // header/footer tags
                                      if (options.md5_data) {
                                          // do not cald md5_data if md5_data_source
                                          // is present - set by flac only - future MPC/SV8 too
                                          if (!options.md5_data_source || !info["md5_data_source"]) {
                                              _self.getHashdata("md5");
                                          }
                                      }

                                      // get the SHA1 sum of the audio/video portion
                                      // of the file - without ID3/APE/Lyrics3/etc
                                      // header/footer tags
                                      if (options.sha1_data) {
                                          _self.getHashdata("sha1");
                                      }

                                      // remove undesired keys
                                      _self.cleanup();

                                      // // return info object
                                      callback(null, info);
                                  });

                              });
                          });
                      });
                }
            });
        });
    };

    this.getFileFormat = function(filedata, filename) {
        // this function will determine the format of a file based on usually
        // the first 2-4 bytes of the file (8 bytes for PNG, 16 bytes for JPG,
        // and in the case of ISO CD image, 6 bytes offset 32kb from the start
        // of the file).

        // Identify file format - loop through $format_info and detect with reg expr
        var format_name, info;
        for (format_name in Util.FormatList) {
            info = Util.formatList[format_name];
            // The /s switch on preg_match() forces preg_match() NOT to treat
            // newline (0x0A) characters as special chars but do a binary match
            if (info["pattern"] && new RegExp(info["pattern"]).test(filedata)) {
                info["include"] = info["group"] + "." + info["module"];
                return info;
            }
        }

        if (/\.mp[123a]$/i.test(filename)) {
            // Too many mp3 encoders on the market put gabage in front of mpeg files
            // use assume format on these if format detection failed
            info = Util.FormatList["mp3"];
            info["include"] = info["group"] + "." + info["module"];
            return info;
        }
        else if (/\.cue$/i.test(filename) && /FILE "[^"]+" (BINARY|MOTOROLA|AIFF|WAVE|MP3)/.test(filedata)) {
            // there"s not really a useful consistent "magic" at the beginning of .cue files to identify them
            // so until I think of something better, just go by filename if all other format checks fail
            // and verify there"s at least one instance of "TRACK xx AUDIO" in the file
            info = Util.formatList["cue"];
            info["include"] = info["group"] + "." + info["module"];
            return info;
        }

        return false;
    };

    this.handleAllTags = function(info) {
        var tags = MediaScan.TAGS;
        // override with setting:
        tags["id3v1"]["id3v1"] = this.options.encoding_id3v1;

        // loop thru comments array
        var comment_name, tagname_encoding_array, tag_name, encoding, tag_key,
            valuearray, key, value;
        for (comment_name in tags) {
            tagname_encoding_array = tags[comment_name];
            tag_name = tagname_encoding_array[0];
            encoding = tagname_encoding_array[1];

            // fill in default encoding type if not already present
            if (info[comment_name] && !info[comment_name]["encoding"])
                info[comment_name]["encoding"] = encoding;

            // copy comments if key name set
            if (!Util.empty(info[comment_name]["comments"])) {
                for (tag_key in info[comment_name]["comments"]) {
                    valuearray = info[comment_name]["comments"][tag_key]
                    for (key in valuearray) {
                        value = valuearray[key];
                        if (Util.trim(value).length > 0) {
                            // do not trim!! Unicode characters will get mangled
                            // if trailing nulls are removed!
                            info["tags"][Util.trim(tag_name)][trim(tag_key)].push(value);
                        }
                    }
                }

                if (!info["tags"][tag_name]) {
                    // comments are set but contain nothing but empty strings, so skip
                    continue;
                }

                if (this.options.tags_html) {
                    for (tag_key in info["tags"][tag_name]) {
                        valuearray = info["tags"][tag_name][tag_key];
                        for (key in valuearray) {
                            value = valuearray[key];
                            if (typeof value == "string") {
                                //info["tags_html"][tag_name][tag_key][key] = getid3_lib::MultiByteCharString2HTML(value, encoding);
                                info["tags_html"][tag_name][tag_key][key] = Util.multiByteCharString2HTML(value, encoding).replace("&#0;", "");
                            }
                            else {
                                info["tags_html"][tag_name][tag_key][key] = value;
                            }
                        }
                    }
                }

                // TODO: character conversion (encoding types)
                //this.charConvert(info["tags"][tag_name], encoding); // only copy gets converted!
            }

        }
        return true;
    };

    this.channelsBitratePlaytimeCalculations = function() {
        //
    };

    this.calculateCompressionRatioVideo = function() {
        //
    };

    this.calculateCompressionRatioAudio = function() {
        //
    };

    this.calculateReplayGain = function() {
        //
    };

    this.processAudioStreams = function() {
        //
    };

    this.getHashdata = function() {
        //
    };

    this.cleanup = function(info) {
        // remove possible empty keys
        ["dataformat", "bits_per_sample", "encoder_options", "streams", "bitrate"].forEach(function(key) {
            if (Util.empty(info["audio"][key]))
                delete info["audio"][key];
            if (Util.empty(info["video"][key]))
                delete info["video"][key];
        });

        // remove empty root keys
        var value, key;
        for (key in info) {
            value = info[key];
            if (Util.empty(value) && value !== 0 && value !== "0")
                delete info[key];
        }

        // remove meaningless entries from unknown-format files
        if (Util.empty(info["fileformat"])) {
            if (!info["avdataoffset"])
                delete info["avdataoffset"];
            if (!info["avdataend"])
                delete info["avdataend"];
        }
    };
}).call(MediaScan.prototype);
