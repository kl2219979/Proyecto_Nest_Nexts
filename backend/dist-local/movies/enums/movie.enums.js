"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MovieStatus = exports.RoomType = exports.AudioType = exports.MovieFormat = void 0;
var MovieFormat;
(function (MovieFormat) {
    MovieFormat["TWO_D"] = "2D";
    MovieFormat["THREE_D"] = "3D";
    MovieFormat["IMAX"] = "IMAX";
    MovieFormat["VIP"] = "VIP";
})(MovieFormat || (exports.MovieFormat = MovieFormat = {}));
var AudioType;
(function (AudioType) {
    AudioType["SUBTITLED"] = "SUBTITLED";
    AudioType["DUBBED"] = "DUBBED";
})(AudioType || (exports.AudioType = AudioType = {}));
var RoomType;
(function (RoomType) {
    RoomType["STANDARD"] = "STANDARD";
    RoomType["VIP"] = "VIP";
    RoomType["IMAX"] = "IMAX";
})(RoomType || (exports.RoomType = RoomType = {}));
var MovieStatus;
(function (MovieStatus) {
    MovieStatus["UPCOMING"] = "UPCOMING";
    MovieStatus["NOW_SHOWING"] = "NOW_SHOWING";
})(MovieStatus || (exports.MovieStatus = MovieStatus = {}));
//# sourceMappingURL=movie.enums.js.map