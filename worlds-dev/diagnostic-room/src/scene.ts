import {
  BoxGeometry,
  BufferGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  Vector3,
} from "three";

export interface DiagnosticScene {
  readonly root: Group;
  readonly dispose: () => void;
}

function lineGeometry(points: readonly Vector3[]): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setFromPoints([...points]);
  return geometry;
}

export function createDiagnosticScene(showGrid: boolean, gridSpacingMm: number, accentColor: number): DiagnosticScene {
  const root = new Group();
  const geometries: BufferGeometry[] = [];
  const materials: MeshBasicMaterial[] = [];
  const lineMaterials: LineBasicMaterial[] = [];
  const lines: LineSegments[] = [];

  const gridPoints: Vector3[] = [];
  for (let coordinate = -300; coordinate <= 300; coordinate += gridSpacingMm) {
    gridPoints.push(new Vector3(-300, 0, coordinate), new Vector3(300, 0, coordinate));
    gridPoints.push(new Vector3(coordinate, 0, -300), new Vector3(coordinate, 0, 300));
  }
  if (showGrid) {
    const gridGeometry = lineGeometry(gridPoints);
    const gridMaterial = new LineBasicMaterial({ color: 0x28404a });
    const grid = new LineSegments(gridGeometry, gridMaterial);
    root.add(grid);
    geometries.push(gridGeometry);
    lineMaterials.push(gridMaterial);
    lines.push(grid);
  }

  const edgeGeometry = lineGeometry([
    new Vector3(-300, 0, -300), new Vector3(300, 0, -300),
    new Vector3(300, 0, -300), new Vector3(300, 300, -300),
    new Vector3(300, 300, -300), new Vector3(-300, 300, -300),
    new Vector3(-300, 300, -300), new Vector3(-300, 0, -300),
    new Vector3(-300, 0, -300), new Vector3(-300, 0, -900),
    new Vector3(300, 0, -300), new Vector3(300, 0, -900),
  ]);
  const edgeMaterial = new LineBasicMaterial({ color: accentColor });
  const edges = new LineSegments(edgeGeometry, edgeMaterial);
  root.add(edges);
  geometries.push(edgeGeometry);
  lineMaterials.push(edgeMaterial);
  lines.push(edges);

  const boxGeometry = new BoxGeometry(40, 40, 40);
  const boxMaterial = new MeshBasicMaterial({ color: accentColor, wireframe: true });
  const nearBox = new Mesh(boxGeometry, boxMaterial);
  nearBox.position.set(-140, 20, -180);
  root.add(nearBox);
  geometries.push(boxGeometry);
  materials.push(boxMaterial);

  const farGeometry = new BoxGeometry(100, 220, 100);
  const farMaterial = new MeshBasicMaterial({ color: 0xf0f0f0, wireframe: true });
  const farBox = new Mesh(farGeometry, farMaterial);
  farBox.position.set(160, 110, -780);
  root.add(farBox);
  geometries.push(farGeometry);
  materials.push(farMaterial);

  const verticalGeometry = lineGeometry([
    new Vector3(0, 0, -420), new Vector3(0, 260, -420),
    new Vector3(-35, 0, -420), new Vector3(-35, 260, -420),
  ]);
  const verticalMaterial = new LineBasicMaterial({ color: 0xffffff });
  const vertical = new LineSegments(verticalGeometry, verticalMaterial);
  root.add(vertical);
  geometries.push(verticalGeometry);
  lineMaterials.push(verticalMaterial);
  lines.push(vertical);

  return {
    root,
    dispose: () => {
      for (const line of lines) {
        line.removeFromParent();
      }
      for (const material of lineMaterials) material.dispose();
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      root.removeFromParent();
      root.clear();
    },
  };
}
