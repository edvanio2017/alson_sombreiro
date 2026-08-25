/**
 * Base das entidades de domínio.
 *
 * A identidade de uma entidade é o seu `id`: duas entidades com o mesmo id
 * são a mesma entidade, independentemente do estado dos restantes atributos.
 */
export abstract class Entity<TProps> {
  protected readonly _id: string;
  protected props: TProps;

  protected constructor(id: string, props: TProps) {
    this._id = id;
    this.props = props;
  }

  get id(): string {
    return this._id;
  }

  equals(other?: Entity<TProps>): boolean {
    if (!other) return false;
    if (this === other) return true;
    return this._id === other._id;
  }
}

/**
 * Objecto de valor: sem identidade própria, é definido pelos seus atributos
 * e é imutável.
 */
export abstract class ValueObject<TProps extends Record<string, unknown>> {
  protected readonly props: Readonly<TProps>;

  protected constructor(props: TProps) {
    this.props = Object.freeze(props);
  }

  equals(other?: ValueObject<TProps>): boolean {
    if (!other) return false;
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
