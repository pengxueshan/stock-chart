/**
 * 格式化时间
 *
 * @export
 */
export function timeFormat() {}

export function randomColor() {
    var r =  Math.floor(Math.random() * 255).toString(16)
    var g =  Math.floor(Math.random() * 255).toString(16)
    var b =  Math.floor(Math.random() * 255).toString(16)
    if (r.length < 2) {
        r = r + r
    }
    if (g.length < 2) {
        g = g + g
    }
    if (b.length < 2) {
        b = b + b
    }
    return '#' + r + g + b
}
