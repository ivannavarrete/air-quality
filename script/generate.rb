require "date"

def generate_year(year)
  File.open("./data/#{year}.csv", "w") do |file|
    file.write("#{header}\n")

    (Date.new(year, 1, 1)..Date.new(year, 12, 31)).each do |date|
      file.write("#{date} 00:00:01,#{values}\n")

      generate_day(date)
    end
  end
end

def generate_day(date)
  File.open("./data/#{date}.csv", "w") do |file|
    file.write("#{header}\n")

    24.times do |hour|
      file.write("#{date} #{hour}:00:00,#{values}\n")
    end
  end
end

def header
  "Date,Temp,CO,NO2,SO2,PM10,PM2_5"
end

def values
  "#{temp},#{co},#{no2},#{so2},#{pm10},#{pm2_5}"
end

def temp
  rand(20) * (rand(2) == 0 ? -1 : 1)
end

def co
  (rand(5) + 1) * 2
end

def no2
  (rand(5) + 1) * 40
end

def so2
  (rand(5) + 1) * 50
end

def pm10
  (rand(5) + 1) * 150
end

def pm2_5
  (rand(5) + 1) * 75
end

generate_year(2018)
