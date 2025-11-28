import pkgutil
import supabase_auth
import inspect

print(f"supabase_auth path: {supabase_auth.__path__}")

def list_submodules(package):
    if hasattr(package, "__path__"):
        for _, name, is_pkg in pkgutil.walk_packages(package.__path__, package.__name__ + "."):
            print(name)

list_submodules(supabase_auth)

try:
    from supabase_auth.errors import AuthApiError
    print("Found: from supabase_auth.errors import AuthApiError")
except ImportError:
    print("Not found in supabase_auth.errors")

try:
    from gotrue.errors import AuthApiError
    print("Found: from gotrue.errors import AuthApiError")
except ImportError:
    print("Not found in gotrue.errors")