using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace CarBooking.Api.Data;

// Used by `dotnet ef` commands only — bypasses real DB connection at design time.
public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var opts = new DbContextOptionsBuilder<AppDbContext>()
            .UseMySql("server=localhost;database=design_time_stub;user=root;password=stub",
                new MySqlServerVersion(new Version(11, 0, 0)))
            .Options;
        return new AppDbContext(opts);
    }
}
