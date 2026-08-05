import { VertexArrayObject } from '@box-local/regl';
import { Geometry, GeometryType } from '../geometry';

export class MeshGeometry extends Geometry {
  public type = GeometryType.Mesh;

  constructor(public vao?: VertexArrayObject) {
    super();
  }
}
