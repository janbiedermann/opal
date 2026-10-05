puts a
BEGIN { a = 1 }
3.times { END { puts 2 } }
