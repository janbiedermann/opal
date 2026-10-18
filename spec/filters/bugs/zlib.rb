# NOTE: run bin/format-filters after changing this file
opal_filter "Zlib" do
  fails "Zlib.adler32 calculates Adler checksum for string" # (2**64).to_s answers 18446744073709552000: an Integer above 2^53 is a float
  fails "Zlib.crc32 calculates CRC checksum for string" # (2**64).to_s answers 18446744073709552000: an Integer above 2^53 is a float
end
