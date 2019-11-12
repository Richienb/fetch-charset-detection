import getCharset from "../utils/get-charset"
import { decode } from "iconv-lite"
import { load as $ } from "cheerio"
import _ from "lodash"

/**
* Detect buffer encoding and convert to target encoding
* ref: http://www.w3.org/TR/2011/WD-html5-20110113/parsing.html#determining-the-character-encoding
*
* @param buffer Incoming buffer.
* @param headers Headers provided with the request.
*/
export function convertBody(buffer: Buffer, headers?: Headers): string {
    const contentType = !_.isNil(headers) ? headers.get("content-type") : null
    let charset: string

    // Header
    if (contentType) charset = getCharset(contentType)

    // No charset in content type, peek at response body for at most 1024 bytes
    const res = _.toString(buffer.slice(0, 1024))

    // HTML5, HTML4 and XML
    if (!charset && res) {
        charset = getCharset(
            $(res)("meta[charset]").attr("charset") || // HTML5
            $(res)("meta[http-equiv][content]").attr("content") || // HTML4
            $(_.replace(res, /<\?(.*)\?>/im, "<$1>"), { xmlMode: true }).root().find("xml").attr("encoding"), // XML
        )
    }

    // Prevent decode issues when sites use incorrect encoding
    // ref: https://hsivonen.fi/encoding-menu/
    if (charset && _.includes(["gb2312", "gbk"], _.lowerCase(charset))) charset = "gb18030"

    // Turn raw buffers into a single utf-8 buffer
    return decode(
        buffer,
        charset || "utf-8",
    )
}