puts "Date,Temp,CO,NO2,SO2,PM10,PM2_5"

31.times do |i|
  puts "2018-01-#{i+1},#{rand(20)*(rand(2) == 0 ? -1 : 1)},#{(rand(5)+1)*2},#{(rand(5)+1)*40},#{(rand(5)+1)*50},#{(rand(5)+1)*150},#{(rand(5)+1)*75}"
end

28.times do |i|
  puts "2018-02-#{i+1},#{rand(20)*(rand(2) == 0 ? -1 : 1)},#{(rand(5)+1)*2},#{(rand(5)+1)*40},#{(rand(5)+1)*50},#{(rand(5)+1)*150},#{(rand(5)+1)*75}"
end
