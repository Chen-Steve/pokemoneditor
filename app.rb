require 'webrick'
require 'sinatra'
require 'json'
require 'tempfile'
require 'rack/contrib'
require 'fileutils'

# Load the Pokemon data processing logic
require_relative 'pokemon'

# Configure Sinatra for development
set :environment, :development
set :show_exceptions, false
set :raise_errors, true
set :dump_errors, false
set :logging, false

# Configure Sinatra
set :public_folder, 'public'
set :views, 'views'
set :uploads, 'uploads'
set :allow_uploads, true

# Create uploads directory if it doesn't exist
FileUtils.mkdir_p(settings.uploads)

# Store data in memory (for demo purposes)
$uploaded_data = nil
$current_file = nil

# Clear data on page load/refresh
get '/' do
  $uploaded_data = nil
  $current_file = nil
  # Clean up old files
  FileUtils.rm_rf(Dir.glob(File.join(settings.uploads, "*")))
  erb :index
end

# API endpoint to clear data
post '/api/clear_data' do
  content_type :json
  $uploaded_data = nil
  $current_file = nil
  # Clean up old files
  FileUtils.rm_rf(Dir.glob(File.join(settings.uploads, "*")))
  { success: true }.to_json
end

# Helper function to recursively inspect data structure
def inspect_data(data, depth = 0, max_depth = 5)
  return "..." if depth >= max_depth
  
  case data
  when Array
    {
      type: "Array",
      length: data.length,
      sample: data.first(3).map { |item| inspect_data(item, depth + 1, max_depth) }
    }
  when Hash
    {
      type: "Hash",
      keys: data.keys,
      sample: data.first(3).map { |k, v| [k, inspect_data(v, depth + 1, max_depth)] }.to_h
    }
  when String
    {
      type: "String",
      length: data.length,
      preview: data[0..50] + (data.length > 50 ? "..." : "")
    }
  when Numeric
    {
      type: "Number",
      value: data
    }
  else
    {
      type: data.class.to_s,
      inspect: data.inspect
    }
  end
end

# Debug endpoint to inspect data structure
get '/api/debug_data' do
  content_type :json
  
  if $uploaded_data
    {
      data_type: $uploaded_data.class.to_s,
      structure: inspect_data($uploaded_data)
    }.to_json
  else
    { error: "No data loaded yet" }.to_json
  end
end

# API endpoint to get processed Pokemon data
get '/api/pokemon_data' do
  content_type :json
  
  if $uploaded_data
    processed_data = process_pokemon_data($uploaded_data)
    processed_data.to_json
  else
    { pokemon: [] }.to_json
  end
end

# API endpoint to handle file upload
post '/api/upload' do
  content_type :json
  
  if params[:game_file] && params[:game_file][:tempfile]
    begin
      # Read the uploaded file
      file_content = params[:game_file][:tempfile].read
      
      # Create a copy in the uploads directory
      file_path = File.join(settings.uploads, "game_#{Time.now.to_i}.rxdata")
      File.binwrite(file_path, file_content)
      $current_file = file_path
      
      # Load and process the data
      begin
        $uploaded_data = Marshal.load(File.binread($current_file))
      rescue => e
        $uploaded_data = safe_load($current_file)
      end
      
      # Return success response
      { success: true }.to_json
      
    rescue => e
      status 500
      { error: "Error processing file: #{e.message}" }.to_json
    end
  else
    status 400
    { error: "No file uploaded" }.to_json
  end
end

# API endpoint to update trainer money
post '/api/update_money' do
  content_type :json
  
  begin
    # Parse JSON from raw body
    request_payload = JSON.parse(request.body.read)
    new_money = request_payload['money'].to_i
    
    # Debug information
    puts "Current uploaded data type: #{$uploaded_data.class}"
    puts "Current money value: #{$uploaded_data.instance_variable_get("@money")}"
    puts "Attempting to set new money value: #{new_money}"
    
    # Validate money value
    unless new_money.is_a?(Integer) && new_money >= 0 && new_money <= 999999999
      halt 400, { error: "Invalid money value", success: false }.to_json
    end
    
    # Check if we have data loaded
    if $uploaded_data.nil? || $current_file.nil?
      halt 400, { error: "No trainer data loaded", success: false }.to_json
    end
    
    # Update the money
    $uploaded_data.instance_variable_set("@money", new_money)
    
    # Save the modified data back to the file
    File.binwrite($current_file, Marshal.dump($uploaded_data))
    
    # Return success response
    { 
      success: true, 
      new_money: new_money,
      download_ready: true
    }.to_json
    
  rescue JSON::ParserError
    halt 400, { error: "Invalid JSON format", success: false }.to_json
  rescue => e
    puts "Error updating money: #{e.class} - #{e.message}"
    puts e.backtrace
    halt 500, { error: "Internal server error", success: false }.to_json
  end
end

# API endpoint to download modified file
get '/api/download' do
  if $current_file && File.exist?($current_file)
    send_file($current_file, 
              filename: "modified_game.rxdata",
              type: 'application/octet-stream')
  else
    status 404
    "No modified file available for download"
  end
end

# Helper method to process Pokemon data into a readable format
def process_pokemon_data(data)
  # Handle PokeBattle_Trainer data
  if data.instance_variable_defined?("@party")
    trainer_data = {
      trainer: {
        name: data.instance_variable_get("@name"),
        id: data.instance_variable_get("@id"),
        money: data.instance_variable_get("@money"),
        badges: data.instance_variable_get("@badges"),
        pokedex: data.instance_variable_get("@pokedex"),
        pokemon_seen: data.instance_variable_get("@seen").count { |x| x },
        pokemon_owned: data.instance_variable_get("@owned").count { |x| x }
      },
      pokemon: data.instance_variable_get("@party").map do |pokemon|
        {
          name: pokemon.instance_variable_get("@name"),
          species: pokemon.instance_variable_get("@species"),
          level: pokemon.instance_variable_get("@obtainLevel"),
          stats: {
            hp: pokemon.instance_variable_get("@hp"),
            total_hp: pokemon.instance_variable_get("@totalhp"),
            attack: pokemon.instance_variable_get("@attack"),
            defense: pokemon.instance_variable_get("@defense"),
            special_attack: pokemon.instance_variable_get("@spatk"),
            special_defense: pokemon.instance_variable_get("@spdef"),
            speed: pokemon.instance_variable_get("@speed")
          },
          moves: pokemon.instance_variable_get("@moves").map do |move|
            next unless move
            {
              id: move.instance_variable_get("@id"),
              pp: move.instance_variable_get("@pp"),
              pp_up: move.instance_variable_get("@ppup")
            }
          end.compact,
          happiness: pokemon.instance_variable_get("@happiness"),
          trainer_id: pokemon.instance_variable_get("@trainerID"),
          trainer_name: pokemon.instance_variable_get("@ot"),
          ivs: pokemon.instance_variable_get("@iv"),
          evs: pokemon.instance_variable_get("@ev")
        }
      end
    }
    
    return trainer_data
  end
  
  # Return empty data if no valid data found
  { trainer: nil, pokemon: [] }
end 