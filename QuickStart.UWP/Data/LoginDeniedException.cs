using System;

namespace QuickStart.UWP.Data
{
    internal class LoginDeniedException : Exception
    {
        public LoginDeniedException()
        {
        }

        public LoginDeniedException(string message) : base(message)
        {
        }

        public LoginDeniedException(string message, Exception innerException) : base(message, innerException)
        {
        }
    }
}