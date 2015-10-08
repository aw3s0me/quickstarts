using Newtonsoft.Json;

namespace QuickStart.DataModel
{
    public class TodoItem
    {
        public string Id { get; set; }

        [JsonProperty("text")]
        public string Text { get; set; }

        [JsonProperty("complete")]
        public bool Complete { get; set; }
    }
}
