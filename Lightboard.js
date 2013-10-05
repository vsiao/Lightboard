var Lightboard = function() {
  var width = Lightboard.VIDEO_WIDTH;
  var height = Lightboard.VIDEO_HEIGHT;
  var video = document.getElementById("video");
      //document.createElement("video");
  var canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  var context = canvas.getContext("2d");
  var lightboard = document.getElementById("lightboard");
  var lightboard_context = lightboard.getContext("2d");
      lightboard_context.beginPath();
      lightboard_context.arc(320, 240, 5, 0, 2*Math.PI);
      lightboard_context.fill();
  var me = this;
  var videoLoop = function() {
    context.drawImage(video, 0, 0, width, height);
    var point = me.findCursor(
        context.getImageData(0, 0, width, height).data);
    // if (point) {
    //   lightboard_context.beginPath();
    //   lightboard_context.arc(point.x, point.y, 5, 0, 2*Math.PI);
    //   lightboard_context.fill();
    // }
    setTimeout(videoLoop, 80);
  };
  getUserMedia({
    video: true,
    audio: false
  }, function(stream) {
    video.src = window.URL.createObjectURL(stream);
    video.play();
    videoLoop();
  }, function(error) {
    console.warn("getUserMedia failed: " + error);
  });
};

Lightboard.VIDEO_WIDTH = 640;
Lightboard.VIDEO_HEIGHT = 480;
Lightboard.BLOCK_WIDTH = 2;
Lightboard.BLOCK_HEIGHT = 2;
Lightboard.BRIGHTNESS_THRESHOLD = 252;
Lightboard.LIGHT_SIZE = 500;

/**
 * @returns point
 *     0 <= point.x < 640
 *     0 <= point.y < 480
 */
Lightboard.prototype.findCursor = function(img_data) {
  var num_lines = Lightboard.VIDEO_HEIGHT / Lightboard.BLOCK_HEIGHT >>> 0;
  var num_cols = Lightboard.VIDEO_WIDTH / Lightboard.BLOCK_WIDTH >>> 0;
  var i, j, x, y;
  var B = [], V = [];
  for (i = 0; i < num_lines; ++i) {
    B.push([]), V.push([]);
    for (j = 0; j < num_cols; ++j) {
      V[i].push(false);
      var brightness_sum = 0;
      for (y = i*Lightboard.BLOCK_HEIGHT;
           y < (i+1)*Lightboard.BLOCK_HEIGHT; ++y) {
        for (x = j*Lightboard.BLOCK_WIDTH;
             x < (j+1)*Lightboard.BLOCK_WIDTH; ++x) {
          var pixel_idx = (y*Lightboard.VIDEO_WIDTH + x)*4;
          var r = img_data[pixel_idx];
          var g = img_data[pixel_idx+1];
          var b = img_data[pixel_idx+2];
          brightness_sum += (3*r+4*g+b) >>> 3;
        }
      }
      B[i][j] = brightness_sum /
          (Lightboard.BLOCK_HEIGHT*Lightboard.BLOCK_WIDTH) >>> 0;
    }
  }
  var max_size = 0;
  var point = null;
  for (i = 0; i < num_lines; ++i) {
    for (j = 0; j < num_cols; ++j) {
      var block_size = 0;
      var min_x = j, max_x = j, min_y = i, max_y = i;
      var search_stack = [{y: i, x: j}];
      while (search_stack.length) {
        var pos = search_stack.pop();
        x = pos.x;
        y = pos.y;
        if (x >= num_cols || y >= num_lines ||
            x < 0 || y < 0 || V[y][x] ||
            B[y][x] <= Lightboard.BRIGHTNESS_THRESHOLD) {
          continue;
        }
        if (x > max_x) max_x = x;
        if (x < min_x) min_x = x;
        if (y > max_y) max_y = y;
        if (y < min_y) min_y = y;
        V[y][x] = true;
        block_size++;
        search_stack.push({y: y+1, x: x});
        search_stack.push({y: y, x: x+1});
        search_stack.push({y: y-1, x: x});
        search_stack.push({y: y, x: x-1});
      }
      if (block_size > max_size &&
          block_size >= Lightboard.LIGHT_SIZE) {
        max_size = block_size;
        point = {
          x: max_x + min_x,
          y: max_y + min_y
        };
      }
    }
  }
  console.log(max_size);
  if (point) console.log(point);
  return point;
};

