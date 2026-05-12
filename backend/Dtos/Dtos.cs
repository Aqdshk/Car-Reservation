namespace CarBooking.Api.Dtos;

public record LoginDto(string Email, string Password);
public record RegisterDto(string Name, string Email, string Password, string? Role);
public record AuthResponse(string Token, int UserId, string Name, string Email, string Role);

public record VehicleDto(int Id, string PlateNumber, string Make, string Model, string Type, string Fuel, int Seats, string Status);
public record CreateVehicleDto(string PlateNumber, string Make, string Model, string Type, string Fuel, int Seats);

public record ReservationDto(
    int Id, int UserId, string UserName, int VehicleId, string VehiclePlate, string VehicleName,
    DateTime StartTime, DateTime EndTime, string Destination, int Passengers, int DistanceKm,
    string? Notes, string Status, DateTime CreatedAt);

public record CreateReservationDto(
    int VehicleId, DateTime StartTime, DateTime EndTime,
    string Destination, int Passengers, int DistanceKm, string? Notes);

public record UpdateStatusDto(string Status);
