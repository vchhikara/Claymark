#!/usr/bin/env python3
"""Minimal, dependency-free PNG decode/crop/encode, using only zlib+struct.
Built for one purpose: crop the top-left WxH pixels out of a larger PNG
screenshot, to work around a headless-Chromium bug (small viewports/
--window-size below ~256px produce corrupted screenshots; large windows
render correctly). Not a general-purpose PNG library.
"""
import struct
import sys
import zlib


def read_png(path):
    with open(path, "rb") as f:
        data = f.read()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", "not a PNG"
    pos = 8
    width = height = bit_depth = color_type = None
    idat = b""
    while pos < len(data):
        length = struct.unpack(">I", data[pos : pos + 4])[0]
        ctype = data[pos + 4 : pos + 8]
        chunk = data[pos + 8 : pos + 8 + length]
        if ctype == b"IHDR":
            width, height, bit_depth, color_type = struct.unpack(">IIBB", chunk[:10])
        elif ctype == b"IDAT":
            idat += chunk
        elif ctype == b"IEND":
            break
        pos += 12 + length
    assert bit_depth == 8, f"only 8-bit supported, got {bit_depth}"
    assert color_type in (2, 6), f"only RGB/RGBA supported, got color_type={color_type}"
    channels = 3 if color_type == 2 else 4
    raw = zlib.decompress(idat)

    stride = width * channels
    out = bytearray(height * stride)
    prev = bytearray(stride)
    p = 0
    for y in range(height):
        filt = raw[p]
        p += 1
        line = bytearray(raw[p : p + stride])
        p += stride
        if filt == 0:
            pass
        elif filt == 1:  # Sub
            for i in range(channels, stride):
                line[i] = (line[i] + line[i - channels]) & 0xFF
        elif filt == 2:  # Up
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 0xFF
        elif filt == 3:  # Average
            for i in range(stride):
                a = line[i - channels] if i >= channels else 0
                b = prev[i]
                line[i] = (line[i] + ((a + b) // 2)) & 0xFF
        elif filt == 4:  # Paeth
            for i in range(stride):
                a = line[i - channels] if i >= channels else 0
                b = prev[i]
                c = prev[i - channels] if i >= channels else 0
                pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                pred = a if pa <= pb and pa <= pc else (b if pb <= pc else c)
                line[i] = (line[i] + pred) & 0xFF
        else:
            raise ValueError(f"unknown filter type {filt}")
        out[y * stride : (y + 1) * stride] = line
        prev = line
    return width, height, channels, bytes(out)


def write_png(path, width, height, channels, pixels):
    color_type = 6 if channels == 4 else 2
    ihdr = struct.pack(">IIBBBBB", width, height, 8, color_type, 0, 0, 0)

    def chunk(ctype, cdata):
        return (
            struct.pack(">I", len(cdata))
            + ctype
            + cdata
            + struct.pack(">I", zlib.crc32(ctype + cdata) & 0xFFFFFFFF)
        )

    stride = width * channels
    raw = bytearray()
    for y in range(height):
        raw.append(0)  # filter type: None — simplest, correct, compresses fine
        raw += pixels[y * stride : (y + 1) * stride]
    idat = zlib.compress(bytes(raw), 9)

    out = b"\x89PNG\r\n\x1a\n"
    out += chunk(b"IHDR", ihdr)
    out += chunk(b"IDAT", idat)
    out += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(out)


def crop_top_left(src, dst, w, h):
    width, height, channels, pixels = read_png(src)
    assert w <= width and h <= height, f"crop {w}x{h} exceeds source {width}x{height}"
    stride = width * channels
    out_stride = w * channels
    out = bytearray(h * out_stride)
    for y in range(h):
        out[y * out_stride : (y + 1) * out_stride] = pixels[
            y * stride : y * stride + out_stride
        ]
    write_png(dst, w, h, channels, bytes(out))


if __name__ == "__main__":
    src, dst, w, h = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
    crop_top_left(src, dst, w, h)
    print(f"cropped {src} -> {dst} ({w}x{h})")
