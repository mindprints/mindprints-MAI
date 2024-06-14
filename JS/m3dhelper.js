/*
a loader for converting simpler format into room structure
*/

function createLightModel() {
  return [
    {
      fillColor: {
        r: 64,
        g: 64,
        b: 64,
      },
      x: [30, -30, -30, 30],
      y: [500, 500, 450, 450],
      z: [30, 30, 30, 30],
      zIndexOffset: 500,
    },
    {
      fillColor: {
        r: 64,
        g: 64,
        b: 64,
      },
      x: [-30, 30, 30, -30],
      y: [500, 500, 450, 450],
      z: [-30, -30, -30, -30],
      zIndexOffset: 500,
    },
    {
      fillColor: {
        r: 64,
        g: 64,
        b: 64,
      },
      x: [30, 30, 30, 30],
      y: [500, 500, 450, 450],
      z: [-30, 30, 30, -30],
      zIndexOffset: 500,
    },
    {
      fillColor: {
        r: 64,
        g: 64,
        b: 64,
      },
      x: [-30, -30, -30, -30],
      y: [500, 500, 450, 450],
      z: [30, -30, -30, 30],
      zIndexOffset: 500,
    },
    {
      fillColor: {
        r: 1024,
        g: 1024,
        b: 1024,
      },
      noShading: true,
      alwaysVisible: true,
      x: [30, -30, -30, 30],
      y: [450, 450, 450, 450],
      z: [30, 30, -30, -30],
      zIndexOffset: 500,
    },
  ];
}

function createLight(x, z) {
  return {
    type: "object",
    ref: "light",
    x,
    y: 0,
    z,
  };
}

function baseWall(
  x1,
  z1,
  x2,
  z2,
  ceilinglevel,
  floorlevel,
  color,
  image,
  transparent = false
) {
  // __comment: "north wall, west side",
  return {
    type: "poly",
    fillColor: transparent
      ? {
          r: 0,
          g: 0,
          b: 0,
          alpha: 0,
        }
      : {
          r: color.r, // + Math.random() * 50,
          g: color.g, // + Math.random() * 50,
          b: color.b, // + Math.random() * 50,
        },
    x: [x1, x2, x2, x1],
    y: [ceilinglevel, ceilinglevel, floorlevel, floorlevel],
    z: [z1, z2, z2, z1],
    zIndexOffset: transparent ? 500 : undefined,
    image,
  };
}

function stdWall(x1, y1, x2, y2, color, image) {
  return baseWall(x1, y1, x2, y2, 500, -500, color, image, false);
}

function wallImage(def, base, x, z) {
  return (
    def && {
      distView: 400,
      zoom: 1,
      ...base,
      ...def,
      x,
      y: 0,
      z,
    }
  );
}

function door(x1, z1, x2, z2, color, image) {
  let dx = x2 - x1;
  let dz = z2 - z1;
  const d = Math.sqrt(dx * dx + dz * dz);
  dx /= d;
  dz /= d;

  let perpx = dz;
  let perpz = -dx;

  const ret = [];

  ret.push(
    baseWall(
      x1,
      z1,
      x2,
      z2,
      500,
      -500,
      color,
      image && {
        x: x1 + dx * 500 - perpx * 100,
        y: 0,
        z: z1 + dz * 500 - perpz * 100,
        name: "Click on pictures to navigate. Click on open doors to change rooms.",
        distView: 400,
        zoom: 1,
        ...image,
      },
      true
    )
  );

  // left side
  ret.push(stdWall(x1, z1, x1 + 300 * dx, z1 + 300 * dz, color));

  // right side
  ret.push(stdWall(x2 - 300 * dx, z2 - 300 * dz, x2, z2, color));

  // door, top
  ret.push(
    baseWall(
      x1 + 300 * dx,
      z1 + 300 * dz,
      x2 - 300 * dx,
      z2 - 300 * dz,
      500,
      200,
      color
    )
  );

  // left inner side
  ret.push(
    baseWall(
      x1 + 300 * dx,
      z1 + 300 * dz,
      x1 + 300 * dx - perpx * 50,
      z1 + 300 * dz - perpz * 50,
      200,
      -500,
      color
    )
  );

  // right inner side
  ret.push(
    baseWall(
      x2 - 300 * dx - perpx * 50,
      z2 - 300 * dz - perpz * 50,
      x2 - 300 * dx,
      z2 - 300 * dz,
      200,
      -500,
      color
    )
  );

  return ret;
}

function createEastWall(wall, room) {
  if (!wall) {
    return [];
  }

  const northPainting = wall.paintings.find((p) => p.position === "north");
  const centerPainting = wall.paintings.find((p) => p.position === "center");
  const southPainting = wall.paintings.find((p) => p.position === "south");

  const ret = [];

  // __comment: "east wall, north side",
  ret.push(
    stdWall(
      -1500,
      -1500,
      -1500,
      -500,
      room.color,
      wallImage(
        northPainting,
        {
          angle: 0,
        },
        -1500,
        -1000
      )
    )
  );

  // __comment: "east wall, south side",
  ret.push(
    stdWall(
      -1500,
      500,
      -1500,
      1500,
      room.color,
      wallImage(
        southPainting,
        {
          angle: 0,
        },
        -1500,
        1000
      )
    )
  );

  if (wall.door) {
    ret.push(
      ...door(
        -1500,
        -500,
        -1500,
        500,
        room.color,
        {
          src: wall.door.preview,
          angle: 0,
          href: `/Json_geometries/${wall.door.link}.json`,
          exit: wall.door.exit,
          exitTo: "east",
        },
        true
      )
    );
  } else {
    ret.push(
      stdWall(
        -1500,
        -500,
        -1500,
        500,
        room.color,
        wallImage(
          centerPainting,
          {
            angle: 0,
          },
          -1500,
          0
        )
      )
    );
  }

  return ret;
}

function createWestWall(wall, room) {
  if (!wall) {
    return [];
  }

  const northPainting = wall.paintings.find((p) => p.position === "north");
  const centerPainting = wall.paintings.find((p) => p.position === "center");
  const southPainting = wall.paintings.find((p) => p.position === "south");

  const ret = [];

  ret.push(
    stdWall(
      1500,
      1500,
      1500,
      500,
      room.color,
      wallImage(
        southPainting,
        {
          angle: -180,
        },
        1500,
        1000
      )
    )
  );

  ret.push(
    stdWall(
      1500,
      -500,
      1500,
      -1500,
      room.color,
      wallImage(
        northPainting,
        {
          angle: -180,
        },
        1500,
        -1000
      )
    )
  );

  if (wall.door) {
    ret.push(
      ...door(
        1500,
        500,
        1500,
        -500,
        room.color,
        {
          src: wall.door.preview,
          angle: -180,
          href: `/Json_geometries/${wall.door.link}.json`,
          exit: wall.door.exit,
          exitTo: "north",
        },
        true
      )
    );
  } else {
    ret.push(
      baseWall(
        1500,
        500,
        1500,
        -500,
        500,
        -500,
        room.color,
        wallImage(
          centerPainting,
          {
            angle: -180,
          },
          1500,
          0
        )
      )
    );
  }

  return ret;
}

function createNorthWall(wall, room) {
  if (!wall) {
    return [];
  }

  const westPainting = wall.paintings.find((p) => p.position === "west");
  const centerPainting = wall.paintings.find((p) => p.position === "center");
  const eastPainting = wall.paintings.find((p) => p.position === "east");

  const ret = [];

  ret.push(
    stdWall(
      1500,
      -1500,
      500,
      -1500,
      room.color,
      wallImage(
        westPainting,
        {
          angle: 90,
        },
        1000,
        -1500
      )
    )
  );

  ret.push(
    stdWall(
      -500,
      -1500,
      -1500,
      -1500,
      room.color,
      wallImage(
        eastPainting,
        {
          angle: 90,
        },
        -1000,
        -1500
      )
    )
  );

  if (wall.door) {
    ret.push(
      ...door(
        500,
        -1500,
        -500,
        -1500,
        room.color,
        {
          src: wall.door.preview,
          angle: 90,
          href: `/Json_geometries/${wall.door.link}.json`,
          exit: wall.door.exit,
          exitTo: "north",
        },
        true
      )
    );
  } else {
    ret.push(
      baseWall(
        500,
        -1500,
        -500,
        -1500,
        500,
        -500,
        room.color,
        wallImage(
          centerPainting,
          {
            angle: 90,
          },
          0,
          -1500
        )
      )
    );
  }

  return ret;
}

function createSouthWall(wall, room) {
  if (!wall) {
    return [];
  }

  const westPainting = wall.paintings.find((p) => p.position === "west");
  const centerPainting = wall.paintings.find((p) => p.position === "center");
  const eastPainting = wall.paintings.find((p) => p.position === "east");

  const ret = [];

  ret.push(
    stdWall(
      -1500,
      1500,
      -500,
      1500,
      room.color,
      wallImage(
        eastPainting,
        {
          angle: -90,
        },
        -1000,
        1500
      )
    )
  );

  ret.push(
    stdWall(
      500,
      1500,
      1500,
      1500,
      room.color,
      wallImage(
        westPainting,
        {
          angle: -90,
        },
        1000,
        1500
      )
    )
  );

  if (wall.door) {
    ret.push(
      ...door(
        -500,
        1500,
        500,
        1500,
        room.color,
        {
          src: wall.door.preview,
          x: 0,
          y: 0,
          z: 1700,
          angle: -90,
          href: `/Json_geometries/${wall.door.link}.json`,
          exit: wall.door.exit,
          exitTo: "south",
        },
        true
      )
    );
  } else {
    ret.push(
      stdWall(
        -500,
        1500,
        500,
        1500,
        room.color,
        wallImage(
          centerPainting,
          {
            angle: -90,
          },
          0,
          1500
        )
      )
    );
  }

  return ret;
}

const loaderCache = {};

async function loaderFunction(url) {
  if (loaderCache[url] !== null && loaderCache[url] !== undefined) {
    return loaderCache[url];
  }

  if (loaderCache[url] === null) {
    return Promise.reject();
  }

  loaderCache[url] = null;

  console.log("loaderFunction", url);

  const req = await fetch(url + "?nocache=" + Math.random());
  const resp = await req.json();
  console.log("loaded resp", resp);

  const resp2 = {
    objects: {
      light: createLightModel(),
    },
    geometry: [
      ...createWestWall(resp.westwall, resp),
      ...createSouthWall(resp.southwall, resp),
      ...createEastWall(resp.eastwall, resp),
      ...createNorthWall(resp.northwall, resp),

      createLight(-1000, 1000),
      createLight(-1000, 0),
      createLight(-1000, -1000),
      createLight(0, 1000),
      createLight(0, -1000),
      createLight(1000, 1000),
      createLight(1000, 0),
      createLight(1000, -1000),
    ],

    params: {
      groundColor: "#444",
      horizonColor: "#000",
      ceilingColor: "#aaa",
      imagesPath: "../images/",
      shadingLight: 300,
      ambientLight: 0.25,

      startX: resp.startX || 0,
      targetX: resp.targetX || 0,
      startZ: resp.startZ || -1500,
      targetZ: resp.targetZ || -1200,
    },
  };

  loaderCache[url] = resp2;

  return resp2;
}

function loadRoom(roomId) {
  console.log("showing room", roomId);
  const url = "/Json_geometries/" + roomId + ".json";
  m3D.init(url, loaderFunction);
}
