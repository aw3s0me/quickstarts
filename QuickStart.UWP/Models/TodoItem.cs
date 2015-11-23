using Newtonsoft.Json;

namespace QuickStart.UWP.Models
{
    class TodoItem
    {
        public string Id { get; set; }

        [JsonProperty("text")]
        public string Title { get; set; }

        [JsonProperty("complete")]
        public bool Completed { get; set; }
    }
}
